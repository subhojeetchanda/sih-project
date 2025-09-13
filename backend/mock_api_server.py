# --- Mock API Server for SIH Project Simulation (Multi-Tourist Version) ---

import pandas as pd
from flask import Flask, jsonify, request
from flask_cors import CORS
import time
from datetime import datetime
import threading

# --- Setup ---
app = Flask(__name__)
CORS(app)

try:
    df_simulation = pd.read_csv("simulation_paths.csv")
    print("✅ 'simulation_paths.csv' loaded successfully.")
except FileNotFoundError:
    print("❌ CRITICAL ERROR: 'simulation_paths.csv' not found.")
    df_simulation = None

# --- In-Memory State Management for MULTIPLE tourists ---
live_tourist_data = {}
tourist_logs = {}  # New dictionary to store logs for each tourist
safety_alerts = []  # Global list for safety alerts
anomaly_detected_tourists = set()  # Track which tourists have already triggered anomaly alerts

# --- Log Management Functions ---
def add_log_entry(tourist_id, lat, lon, status):
    """Add a new log entry for a tourist"""
    if tourist_id not in tourist_logs:
        tourist_logs[tourist_id] = []
    
    log_entry = {
        "tourist_id": tourist_id,
        "lat": lat,
        "lon": lon,
        "timestamp": datetime.now().isoformat(),
        "status": status
    }
    
    tourist_logs[tourist_id].append(log_entry)
    
    # Keep only the last 1000 entries to prevent memory issues
    if len(tourist_logs[tourist_id]) > 1000:
        tourist_logs[tourist_id] = tourist_logs[tourist_id][-1000:]

# --- API Endpoints ---

@app.route("/")
def home():
    return "<h极速1>Mock API Server is Running (Multi-Tourist)</h1>"

@app.route("/reset_simulation", methods=["GET"])
def reset_simulation():
    global live_tourist_data, tourist_logs, safety_alerts, anomaly_detected_tourists
    live_tourist_data = {}
    tourist_logs = {}
    safety_alerts = []
    anomaly_detected_tourists = set()
    return jsonify({"status": "Simulation reset"})

@app.route("/get_tourist_ids")
def get_tourist_ids():
    if df_simulation is None:
        return jsonify({"error": "Dataset not loaded"}), 500

    normal_ids = (
        df_simulation[df_simulation["path_type"] == "normal"]["tourist_id"]
        .unique()
        .tolist()
    )
    anomaly_ids = (
        df_simulation[df_simulation["path_type"] == "anomaly"]["tourist_id"]
        .unique()
        .tolist()
    )

    return jsonify({"normal": normal_ids, "anomaly": anomaly_ids})

@app.route("/get_path")
def get_path():
    tourist_id = request.args.get("id")
    req_type = request.args.get("type")

    path_df = df_simulation[df_simulation["tourist_id"] == tourist_id]

    if path_df.empty:
        return jsonify({"error": "Tourist ID not found"}), 404

    actual_type = path_df["path_type"].iloc[0]
    if req_type and req_type != actual_type:
        return jsonify({"error": "Path type mismatch"}), 400

    path_data = path_df[["lat", "lon"]].to_dict("records")

    # Initialize this tourist's data in our live state
    live_tourist_data[tourist_id] = {
        "lat": path_data[0]["lat"],
        "lon": path_data[0]["lon"],
        "status": "normal",   # default
        "path_type": actual_type,
        "timestamp": datetime.now().isoformat()
    }
    
    # Add initial log entry
    add_log_entry(tourist_id, path_data[0]["lat"], path_data[0]["lon"], "normal")

    return jsonify(
        {"tourist_id": tourist_id, "path_type": actual_type, "path": path_data}
    )

@app.route("/update_location", methods=["POST"])
def update_location():
    data = request.get_json()
    tourist_id = data.get("tourist_id")
    lat = data.get("lat")
    lon = data.get("lon")
    status = data.get("status", "normal")

    if tourist_id in live_tourist_data:
        live_tourist_data[tourist_id]["lat"] = lat
        live_tourist_data[tourist_id]["lon"] = lon
        # Only update status if it's not SOS (SOS should persist until explicitly resolved)
        if live_tourist_data[tourist_id]["status"] != "sos":
            live_tourist_data[tourist_id]["status"] = status
        live_tourist_data[tourist_id]["timestamp"] = datetime.now().isoformat()
        
        # Add log entry with current status
        add_log_entry(tourist_id, lat, lon, live_tourist_data[tourist_id]["status"])

    return jsonify({"status": "极速updated"})

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    tourist_id = data.get("tourist_id")
    path_type = data.get("path_type")
    path_chunk = data.get("path", [])

    if tourist_id in live_tourist_data and live_tourist_data[tourist_id]["status"] != "sos":
        if path_type == "anomaly" and len(path_chunk) > 30:
            live_tourist_data[tourist_id]["status"] = "anomaly"
            
            # Add anomaly alert only if this tourist hasn't triggered one before
            if tourist_id not in anomaly_detected_tourists:
                alert_message = f"You are on a wrong anomalous path. Return to the correct path immediately."
                safety_alerts.append({
                    "message": alert_message,
                    "timestamp": datetime.now().isoformat(),
                    "type": "anomaly",
                    "tourist_id": tourist_id
                })
                anomaly_detected_tourists.add(tourist_id)
        else:
            live_tourist_data[tourist_id]["status"] = "normal"
            
        # Update timestamp and add log entry
        live_tourist_data[tourist_id]["timestamp"] = datetime.now().isoformat()
        add_log_entry(
            tourist_id, 
            live_tourist_data[tourist_id]["lat"], 
            live_tourist_data[tourist_id]["lon"], 
            live_tourist_data[tourist_id]["status"]
        )

    time.sleep(0.1)
    return jsonify({"status": "prediction processed"})

@app.route("/sos", methods=["POST"])
def sos():
    data = request.get_json()
    tourist_id = data.get("tourist_id")
    lat = data.get("lat")
    lon = data.get("lon")
    
    print(f"🚨 SOS RECEIVED! From Tourist ID: {tourist_id} at {lat}, {lon}")

    # If tourist doesn't exist in live data, create an entry
    if tourist_id not in live_tourist_data:
        live_tourist_data[tourist_id] = {
            "lat": lat,
            "lon": lon,
            "status": "sos",
            "timestamp": datetime.now().isoformat()
        }
    else:
        # Update existing tourist with SOS status
        live_tourist_data[tourist_id]["status"] = "sos"
        live_tourist_data[tourist_id]["timestamp"] = datetime.now().isoformat()
        if lat and lon:
            live_tourist_data[tourist_id]["lat"] = lat
            live_tourist_data[tourist_id]["lon"] = lon
        
    # Add log entry for SOS
    add_log_entry(tourist_id, lat, lon, "sos")
    
    # Add SOS alert with user-friendly message
    alert_message = f"You raised an SOS. Help is on the way! Stay where you are."
    safety_alerts.append({
        "message": alert_message,
        "timestamp": datetime.now().isoformat(),
        "type": "sos",
        "tourist_id": tourist_id
    })

    return jsonify({"status": "SOS Signal Received"})

@app.route("/resolve_sos", methods=["POST"])
def resolve_sos():
    data = request.get_json()
    tourist_id = data.get("tourist_id")
    
    print(f"✅ Resolving SOS for Tourist ID: {tourist_id}")

    if tourist_id in live_tourist_data:
        # Change status back to normal
        live_tourist_data[tourist_id]["status"] = "normal"
        live_tourist_data[tourist_id]["timestamp"] = datetime.now().isoformat()
        
        # Add log entry for SOS resolution
        add_log_entry(
            tourist_id, 
            live_tourist_data[tourist_id]["lat"], 
            live_tourist_data[tourist_id]["lon"], 
            "normal"
        )

    return jsonify({"status": "SOS Resolved"})

@app.route("/get_live_statuses")
def get_live_statuses():
    return jsonify(live_tourist_data)

@app.route("/get_logs/<string:tourist_id>")
def get_logs(tourist_id):
    if tourist_id in tourist_logs:
        return jsonify(tourist_logs[tourist_id])
    else:
        return jsonify([])

@app.route("/get_safety_alerts")
def get_safety_alerts():
    return jsonify(safety_alerts)

@app.route("/clear_safety_alerts", methods=["POST"])
def clear_safety_alerts():
    global safety_alerts
    safety_alerts = []
    return jsonify({"status": "Alerts cleared"})

# Heatmap endpoints
@app.route("/get_heatmap_data")
def get_heatmap_data():
    heatmap_data = []
    
    for tourist_id, logs in tourist_logs.items():
        for log in logs:
            # Assign intensity based on status
            intensity = 0.3  # Default for normal
            if log["status"] == "anomaly":
                intensity = 0.6
            elif log["status"] == "sos":
                intensity = 1.0
                
            heatmap_data.append([log["lat"], log["lon"], intensity])
    
    return jsonify(heatmap_data)

# Error handlers to ensure JSON responses
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == "__main__":
    app.run(port=5000, debug=True)