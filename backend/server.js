// --- Mock API Server for SIH Project Simulation (Multi-Tourist Version) ---
// Node.js + Express.js Implementation

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const csv = require("csv-parser");

const app = express();
const PORT = 5001;

app.use(cors());
app.use(bodyParser.json());

// --- Load CSV Simulation Data ---
let df_simulation = [];
fs.createReadStream("simulation_paths.csv")
  .pipe(csv())
  .on("data", (row) => df_simulation.push(row))
  .on("end", () => {
    console.log("✅ 'simulation_paths.csv' loaded successfully.");
  })
  .on("error", () => {
    console.error("❌ CRITICAL ERROR: 'simulation_paths.csv' not found.");
  });

// --- In-memory state ---
let liveTouristData = {};
let touristLogs = {};
let safetyAlerts = [];
let anomalyDetectedTourists = new Set();

// --- Helper: add log entry ---
function addLogEntry(touristId, lat, lon, status) {
  if (!touristLogs[touristId]) touristLogs[touristId] = [];

  const logEntry = {
    tourist_id: touristId,
    lat: parseFloat(lat),
    lon: parseFloat(lon),
    timestamp: new Date().toISOString(),
    status: status,
  };

  touristLogs[touristId].push(logEntry);
  if (touristLogs[touristId].length > 1000) {
    touristLogs[touristId] = touristLogs[touristId].slice(-1000);
  }
}

// --- Routes ---

// Home
app.get("/", (req, res) => {
  res.send("<h1>Mock API Server is Running (Multi-Tourist)</h1>");
});

// Reset
app.get("/reset_simulation", (req, res) => {
  liveTouristData = {};
  touristLogs = {};
  safetyAlerts = [];
  anomalyDetectedTourists = new Set();
  res.json({ status: "Simulation reset" });
});

// Get tourist IDs
app.get("/get_tourist_ids", (req, res) => {
  if (!df_simulation.length)
    return res.status(500).json({ error: "Dataset not loaded" });

  const normalIds = [
    ...new Set(
      df_simulation
        .filter((r) => r.path_type === "normal")
        .map((r) => r.tourist_id)
    ),
  ];
  const anomalyIds = [
    ...new Set(
      df_simulation
        .filter((r) => r.path_type === "anomaly")
        .map((r) => r.tourist_id)
    ),
  ];

  res.json({ normal: normalIds, anomaly: anomalyIds });
});

// Get path for a tourist
app.get("/get_path", (req, res) => {
  const touristId = req.query.id;
  const reqType = req.query.type;

  const pathData = df_simulation.filter((r) => r.tourist_id === touristId);
  if (!pathData.length)
    return res.status(404).json({ error: "Tourist ID not found" });

  const actualType = pathData[0].path_type;
  if (reqType && reqType !== actualType)
    return res.status(400).json({ error: "Path type mismatch" });

  const coords = pathData.map((r) => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  }));

  liveTouristData[touristId] = {
    lat: coords[0].lat,
    lon: coords[0].lon,
    status: "normal",
    path_type: actualType,
    timestamp: new Date().toISOString(),
  };

  addLogEntry(touristId, coords[0].lat, coords[0].lon, "normal");
  res.json({ tourist_id: touristId, path_type: actualType, path: coords });
});

// Update location
app.post("/update_location", (req, res) => {
  const { tourist_id, lat, lon, status = "normal" } = req.body;

  if (liveTouristData[tourist_id]) {
    liveTouristData[tourist_id].lat = lat;
    liveTouristData[tourist_id].lon = lon;
    if (liveTouristData[tourist_id].status !== "sos") {
      liveTouristData[tourist_id].status = status;
    }
    liveTouristData[tourist_id].timestamp = new Date().toISOString();

    addLogEntry(
      tourist_id,
      lat,
      lon,
      liveTouristData[tourist_id].status
    );
  }
  res.json({ status: "updated" });
});

// Predict (mock ML logic)
app.post("/predict", (req, res) => {
  const { tourist_id, path_type, path = [] } = req.body;

  if (
    liveTouristData[tourist_id] &&
    liveTouristData[tourist_id].status !== "sos"
  ) {
    if (path_type === "anomaly" && path.length > 30) {
      liveTouristData[tourist_id].status = "anomaly";

      if (!anomalyDetectedTourists.has(tourist_id)) {
        safetyAlerts.push({
          message:
            "You are on a wrong anomalous path. Return to the correct path immediately.",
          timestamp: new Date().toISOString(),
          type: "anomaly",
          tourist_id,
        });
        anomalyDetectedTourists.add(tourist_id);
      }
    } else {
      liveTouristData[tourist_id].status = "normal";
    }

    liveTouristData[tourist_id].timestamp = new Date().toISOString();
    addLogEntry(
      tourist_id,
      liveTouristData[tourist_id].lat,
      liveTouristData[tourist_id].lon,
      liveTouristData[tourist_id].status
    );
  }

  setTimeout(() => res.json({ status: "prediction processed" }), 100);
});

// SOS
app.post("/sos", (req, res) => {
  const { tourist_id, lat, lon } = req.body;
  console.log(`🚨 SOS RECEIVED! From Tourist ID: ${tourist_id} at ${lat}, ${lon}`);

  liveTouristData[tourist_id] = {
    lat,
    lon,
    status: "sos",
    timestamp: new Date().toISOString(),
  };
  addLogEntry(tourist_id, lat, lon, "sos");

  safetyAlerts.push({
    message: "You raised an SOS. Help is on the way! Stay where you are.",
    timestamp: new Date().toISOString(),
    type: "sos",
    tourist_id,
  });
  res.json({ status: "SOS Signal Received" });
});

// Resolve SOS
app.post("/resolve_sos", (req, res) => {
  const { tourist_id } = req.body;
  console.log(`✅ Resolving SOS for Tourist ID: ${tourist_id}`);

  if (liveTouristData[tourist_id]) {
    liveTouristData[tourist_id].status = "normal";
    liveTouristData[tourist_id].timestamp = new Date().toISOString();
    addLogEntry(
      tourist_id,
      liveTouristData[tourist_id].lat,
      liveTouristData[tourist_id].lon,
      "normal"
    );
  }
  res.json({ status: "SOS Resolved" });
});

// Get statuses, logs, alerts
app.get("/get_live_statuses", (req, res) => res.json(liveTouristData));
app.get("/get_logs/:id", (req, res) =>
  res.json(touristLogs[req.params.id] || [])
);
app.get("/get_safety_alerts", (req, res) => res.json(safetyAlerts));
app.post("/clear_safety_alerts", (req, res) => {
  safetyAlerts = [];
  res.json({ status: "Alerts cleared" });
});

// Heatmap
app.get("/get_heatmap_data", (req, res) => {
  const heatmapData = [];
  for (let [touristId, logs] of Object.entries(touristLogs)) {
    logs.forEach((log) => {
      let intensity = 0.3;
      if (log.status === "anomaly") intensity = 0.6;
      if (log.status === "sos") intensity = 1.0;
      heatmapData.push([log.lat, log.lon, intensity]);
    });
  }
  res.json(heatmapData);
});

// --- Error handlers ---
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});