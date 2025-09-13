# --- API Test Client (Updated for Realistic Testing) ---
# This version loads a real path from your dataset to ensure correct classification.

import requests
import json
import pandas as pd
import random

# The URL of your locally running Flask server
API_URL = "http://127.0.0.1:5000/predict"

# --- Load the datasets to get realistic paths ---
try:
    df_normal = pd.read_csv('normal_data.csv')
except FileNotFoundError:
    print("❌ Error: 'normal_data.csv' not found. Please place it in the same folder.")
    df_normal = None


# --- Prepare a realistic normal path ---
if df_normal is not None:
    # Get a random normal tourist ID
    normal_tourist_id = random.choice(df_normal['tourist_id'].unique())
    # Get all data points for this tourist's path
    realistic_normal_path = df_normal[df_normal['tourist_id'] == normal_tourist_id]

    # Format it for the API
    normal_path_data = {
        "path": realistic_normal_path[['tourist_id', 'lat', 'lon', 'timestamp']].to_dict('records')
    }
else:
    normal_path_data = None # Set to None if file is not found

# This path has a very high speed, making it anomalous.
anomalous_path_data = {
    "path": [
        {"tourist_id": "test_anomaly_002", "lat": 27.33, "lon": 88.61, "timestamp": "2025-08-30 10:00:00"},
        {"tourist_id": "test_anomaly_002", "lat": 28.00, "lon": 88.90, "timestamp": "2025-08-30 10:05:00"} # Large distance in 5 mins
    ]
}

def test_endpoint(payload, description):
    """A helper function to send a request and print the response."""
    print(f"--- Testing with: {description} ---")
    if payload is None:
        print("Skipping test, data file not found.")
        print("-" * 35 + "\n")
        return

    try:
        response = requests.post(API_URL, json=payload)

        if response.status_code == 200:
            print("✅ Success! API Response:")
            print(json.dumps(response.json(), indent=2))
        else:
            print(f"❌ Error! Status Code: {response.status_code}")
            print(f"Response Body: {response.text}")

    except requests.exceptions.ConnectionError as e:
        print("❌ Connection Error: Could not connect to the API.")
        print("Please make sure the 'app.py' server is running.")
    print("-" * 35 + "\n")


if __name__ == "__main__":
    if normal_path_data:
        test_endpoint(normal_path_data, f"Realistic Normal Path (ID: {normal_tourist_id})")

    test_endpoint(anomalous_path_data, "Anomalous Path Data")

