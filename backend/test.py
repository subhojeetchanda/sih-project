# --- API Test Client (Updated to use simulation_paths.csv) ---

import requests
import json
import pandas as pd
import random

# The URL of your locally running Flask server
API_URL = "http://127.0.0.1:5000/predict"

# --- Load the curated simulation dataset ---
try:
    df_simulation = pd.read_csv('simulation_paths.csv')
    print("✅ Successfully loaded 'simulation_paths.csv'.")

    # Separate the paths for testing
    df_normal_paths = df_simulation[df_simulation['path_type'] == 'normal']
    df_anomalous_paths = df_simulation[df_simulation['path_type'] == 'anomaly']

except FileNotFoundError:
    print("❌ Error: 'simulation_paths.csv' not found. Please run 'create_simulation_data.py' first.")
    df_simulation = None

# --- Prepare a realistic normal path from the simulation file ---
if df_simulation is not None and not df_normal_paths.empty:
    normal_tourist_id = random.choice(df_normal_paths['tourist_id'].unique())
    realistic_normal_path = df_normal_paths[df_normal_paths['tourist_id'] == normal_tourist_id]

    normal_path_data = {
        "path": realistic_normal_path[['tourist_id', 'lat', 'lon', 'timestamp']].to_dict('records')
    }
else:
    normal_path_data = None

# --- Prepare a realistic anomalous path from the simulation file ---
if df_simulation is not None and not df_anomalous_paths.empty:
    anomalous_tourist_id = random.choice(df_anomalous_paths['tourist_id'].unique())
    realistic_anomalous_path = df_anomalous_paths[df_anomalous_paths['tourist_id'] == anomalous_tourist_id]

    anomalous_path_data = {
        "path": realistic_anomalous_path[['tourist_id', 'lat', 'lon', 'timestamp']].to_dict('records')
    }
else:
    anomalous_path_data = None


def test_endpoint(payload, description):
    """A helper function to send a request and print the response."""
    print(f"--- Testing with: {description} ---")
    if payload is None:
        print("Skipping test, data could not be loaded.")
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

    if anomalous_path_data:
        test_endpoint(anomalous_path_data, f"Realistic Anomaly Path (ID: {anomalous_tourist_id})")
