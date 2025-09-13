# --- AI Prediction Server ---
# Save this file as app.py

# 1. Import Libraries
import flask
from flask import Flask, request, jsonify
import xgboost as xgb
import pickle
import pandas as pd
import numpy as np

# --- 2. Define Feature Engineering Functions ---
# These must be identical to the ones used for training.
def haversine(lat1, lon1, lat2, lon2):
    R = 6371
    dLat = np.radians(lat2 - lat1); dLon = np.radians(lon2 - lon1)
    a = np.sin(dLat / 2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dLon / 2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return R * c

def calculate_path_features(df):
    # Ensure timestamp is in datetime format
    df['timestamp_dt'] = pd.to_datetime(df['timestamp'])
    df = df.sort_values(['tourist_id', 'timestamp_dt'])

    # Calculate speed and other features
    df['time_delta'] = df.groupby('tourist_id')['timestamp_dt'].diff().dt.total_seconds().fillna(0)
    df['lat_prev'] = df.groupby('tourist_id')['lat'].shift(1)
    df['lon_prev'] = df.groupby('tourist_id')['lon'].shift(1)
    df['distance'] = haversine(df['lat_prev'], df['lon_prev'], df['lat'], df['lon']).fillna(0)
    df['speed'] = (df['distance'] / (df['time_delta'] / 3600)).fillna(0)
    df.replace([np.inf, -np.inf], 0, inplace=True)
    df['speed'].fillna(0, inplace=True)

    # Aggregate features for the entire path
    agg_features = df.groupby('tourist_id').agg(
        mean_speed=('speed', 'mean'),
        std_speed=('speed', 'std'),
        max_speed=('speed', 'max'),
        total_distance=('distance', 'sum'),
        total_duration_seconds=('time_delta', 'sum'),
        num_points=('lat', 'count')
    ).reset_index()
    return agg_features

# --- 3. Load the Saved Model and Scaler ---
# These are loaded only once when the server starts up.
print("Loading model and scaler...")
try:
    model = xgb.XGBClassifier()
    model.load_model("final_tuned_xgboost_model.json")

    with open('final_scaler.pkl', 'rb') as f:
        scaler = pickle.load(f)

    print("✅ Model and scaler loaded successfully.")
except Exception as e:
    print(f"❌ Error loading model or scaler: {e}")
    model = None
    scaler = None

# --- 4. Initialize the Flask App ---
app = Flask(__name__)

# --- 5. Define the Prediction Endpoint ---
@app.route("/predict", methods=['POST'])
def predict():
    if not model or not scaler:
        return jsonify({"error": "Model not loaded. Check server logs."}), 500

    # Get the JSON data sent from the client
    data = request.get_json()
    if not data or 'path' not in data:
        return jsonify({"error": "Invalid input: 'path' key is missing."}), 400

    # Convert the incoming data into a DataFrame
    path_df = pd.DataFrame(data['path'])

    # --- Processing Pipeline ---
    # 1. Engineer features from the raw path data
    features_df = calculate_path_features(path_df)

    # 2. Prepare features for prediction
    features_to_predict = features_df.drop(['tourist_id'], axis=1, errors='ignore')
    features_to_predict.fillna(0, inplace=True)

    # 3. Scale the features using the loaded scaler
    scaled_features = scaler.transform(features_to_predict)

    # 4. Make a prediction and get probabilities
    prediction = model.predict(scaled_features)[0]
    probability = model.predict_proba(scaled_features)[0]

    # --- Create the JSON Response ---
    is_anomaly = bool(prediction == 1)
    response = {
        'tourist_id': path_df['tourist_id'].iloc[0],
        'is_anomaly': is_anomaly,
        'confidence_normal': f"{probability[0]:.2f}",
        'confidence_anomaly': f"{probability[1]:.2f}"
    }

    return jsonify(response)

# --- 6. Define a simple Homepage ---
@app.route("/")
def home():
    return "<h1>Smart Tourist Safety - AI Server is Running!</h1>"

# --- 7. Run the App ---
if __name__ == "__main__":
    # Use host='0.0.0.0' to make the server accessible on your local network
    app.run(host='0.0.0.0', port=5000)
