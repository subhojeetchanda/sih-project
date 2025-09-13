# --- Script to Convert a Simulated Path to GeoJSON Format ---

import pandas as pd
import json
import random

# --- Configuration ---
SIMULATION_FILE = 'simulation_paths.csv'

# 1. Load the curated simulation paths
try:
    df = pd.read_csv(SIMULATION_FILE)
except FileNotFoundError:
    print(f"❌ Error: '{SIMULATION_FILE}' not found. Please create it first.")
    exit()

# 2. Select one random tourist path to convert
if df.empty:
    print("❌ Error: The simulation file is empty.")
    exit()

tourist_id = random.choice(df['tourist_id'].unique())
path_df = df[df['tourist_id'] == tourist_id]

print(f"Converting path for tourist: {tourist_id}")
print(f"Path Type: {path_df['path_type'].iloc[0]}")
print(f"Number of points in path: {len(path_df)}")


# 3. Extract the coordinates into the required format
# GeoJSON format requires [longitude, latitude] for each point
coordinates = path_df[['lon', 'lat']].values.tolist()

# 4. Create the GeoJSON structure for a 'LineString'
geojson_data = {
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "tourist_id": tourist_id,
                "path_type": path_df['path_type'].iloc[0],
                # --- ADDED: Styling hints for viewers like geojson.io ---
                "stroke": "#FF5733",  # An orange-red color
                "stroke-width": 2,
                "stroke-opacity": 1,
                "stroke-dasharray": "10, 5" # This creates the dotted effect (10px line, 5px gap)
            },
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates
            }
        }
    ]
}

# 5. Save the GeoJSON data to a file
output_filename = f"{tourist_id}_path.geojson"
with open(output_filename, 'w') as f:
    json.dump(geojson_data, f, indent=2)

print(f"\n✅ Success! Path saved to '{output_filename}'.")
print("\n--- GeoJSON Content ---")
# Print the created GeoJSON content to the console
print(json.dumps(geojson_data, indent=2))

