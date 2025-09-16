// --- Mock API Server for SIH Project Simulation (Multi-Tourist Version) ---
// Node.js + Express.js Implementation

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const fs = require("fs");
const csv = require("csv-parser");
const path = require("path");
const bcrypt = require("bcryptjs");

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
let touristToUserMap = {}; // New mapping to track which user is monitoring which tourist

// --- User Authentication Data (Local Storage) ---
const usersFile = path.join(__dirname, 'users.json');
const authUsersFile = path.join(__dirname, 'authUsers.json'); // New file for authentication users

// Load users from file (for live-dashboard)
let users = [];
try {
  if (fs.existsSync(usersFile)) {
    const data = fs.readFileSync(usersFile, 'utf8');
    users = JSON.parse(data);
  }
} catch (error) {
  console.error('Error loading users:', error);
}

// Load authentication users from file (for registration/login)
let authUsers = [];
try {
  if (fs.existsSync(authUsersFile)) {
    const data = fs.readFileSync(authUsersFile, 'utf8');
    authUsers = JSON.parse(data);
  }
} catch (error) {
  console.error('Error loading auth users:', error);
}

// Save users to file (for live-dashboard)
function saveUsers() {
  try {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Error saving users:', error);
  }
}

// Save authentication users to file (for registration/login)
function saveAuthUsers() {
  try {
    fs.writeFileSync(authUsersFile, JSON.stringify(authUsers, null, 2));
  } catch (error) {
    console.error('Error saving auth users:', error);
  }
}

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

// --- Authentication Routes (for live-dashboard) ---

// User registration (for live-dashboard)
app.post("/register", (req, res) => {
  const { username, phone, email } = req.body;

  // Validate input
  if (!username || !phone || !email) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Check if user already exists
  const existingUser = users.find(user => 
    user.username === username || user.phone === phone || user.email === email
  );

  if (existingUser) {
    return res.status(400).json({ error: "User already exists" });
  }

  // Create new user
  const newUser = {
    id: Date.now().toString(),
    username,
    phone,
    email,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers();

  res.json({ 
    success: true, 
    message: "User registered successfully",
    user: { id: newUser.id, username: newUser.username }
  });
});

// User login (for live-dashboard)
app.post("/login", (req, res) => {
  const { username, phone } = req.body;

  // Validate input
  if (!username && !phone) {
    return res.status(400).json({ error: "Provide either username or phone" });
  }

  // Find user
  let user;
  if (username) {
    user = users.find(u => u.username === username);
  } else {
    user = users.find(u => u.phone === phone);
  }

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ 
    success: true, 
    message: "Login successful",
    user: { id: user.id, username: user.username }
  });
});

// --- Enhanced Authentication Routes (for registration/login page) ---

// Enhanced user registration
app.post("/auth/register", async (req, res) => {
  const { username, email, password, dateOfBirth, aadhaarNumber, phone, pathType } = req.body;

  // Validate input
  if (!username || !email || !password || !dateOfBirth || !aadhaarNumber || !phone || !pathType) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // Validate Aadhaar number (12 digits)
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return res.status(400).json({ error: "Aadhaar number must be 12 digits" });
  }

  // Validate phone number (10 digits)
  if (!/^\d{10}$/.test(phone)) {
    return res.status(400).json({ error: "Phone number must be 10 digits" });
  }

  // Check if user already exists
  const existingUser = authUsers.find(user => 
    user.username === username || user.email === email || user.phone === phone || user.aadhaarNumber === aadhaarNumber
  );

  if (existingUser) {
    let field = "";
    if (existingUser.username === username) field = "username";
    else if (existingUser.email === email) field = "email";
    else if (existingUser.phone === phone) field = "phone";
    else if (existingUser.aadhaarNumber === aadhaarNumber) field = "Aadhaar number";
    
    return res.status(400).json({ error: `User with this ${field} already exists` });
  }

  try {
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      dateOfBirth,
      aadhaarNumber,
      phone,
      pathType, // Store the selected path type
      createdAt: new Date().toISOString()
    };

    authUsers.push(newUser);
    saveAuthUsers();

    res.json({ 
      success: true, 
      message: "User registered successfully",
      user: { id: newUser.id, username: newUser.username, pathType: newUser.pathType }
    });
  } catch (error) {
    console.error('Error during registration:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Enhanced user login
app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  // Find user
  const user = authUsers.find(u => u.username === username);
  
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  try {
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    res.json({ 
      success: true, 
      message: "Login successful",
      user: { id: user.id, username: user.username, pathType: user.pathType }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get all users (for testing)
app.get("/users", (req, res) => {
  res.json(users);
});

// Get all auth users (for testing)
app.get("/auth/users", (req, res) => {
  res.json(authUsers);
});

// --- Tourist Simulation Routes ---

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
  touristToUserMap = {}; // Reset the mapping on simulation reset
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
app.post("/get_path", (req, res) => {
  const { tourist_id, type, username } = req.body;

  const pathData = df_simulation.filter((r) => r.tourist_id === tourist_id);
  if (!pathData.length)
    return res.status(404).json({ error: "Tourist ID not found" });

  const actualType = pathData[0].path_type;
  if (type && type !== actualType)
    return res.status(400).json({ error: "Path type mismatch" });

  const coords = pathData.map((r) => ({
    lat: parseFloat(r.lat),
    lon: parseFloat(r.lon),
  }));

  liveTouristData[tourist_id] = {
    lat: coords[0].lat,
    lon: coords[0].lon,
    status: "normal",
    path_type: actualType,
    username: username || "Unknown", // Store the username with the tourist data
    timestamp: new Date().toISOString(),
  };

  // Map the tourist to the user
  if (username) {
    touristToUserMap[tourist_id] = username;
  }

  addLogEntry(tourist_id, coords[0].lat, coords[0].lon, "normal");
  res.json({ tourist_id: tourist_id, path_type: actualType, path: coords });
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
          message: "You are on a wrong anomalous path. Return to the correct path immediately.",
          timestamp: new Date().toISOString(),
          type: "anomaly",
          tourist_id,
          username: touristToUserMap[tourist_id] || "Unknown" // Include username in alert
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
    username: touristToUserMap[tourist_id] || "Unknown", // Include username in SOS data
    timestamp: new Date().toISOString(),
  };
  addLogEntry(tourist_id, lat, lon, "sos");

  safetyAlerts.push({
    message: "You raised an SOS. Help is on the way! Stay where you are.",
    timestamp: new Date().toISOString(),
    type: "sos",
    tourist_id,
    username: touristToUserMap[tourist_id] || "Unknown" // Include username in alert
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
app.get("/get_live_statuses", (req, res) => {
  // Add username to each tourist's data
  const statusesWithUsernames = {};
  for (const [touristId, data] of Object.entries(liveTouristData)) {
    statusesWithUsernames[touristId] = {
      ...data,
      username: touristToUserMap[touristId] || "Unknown"
    };
  }
  res.json(statusesWithUsernames);
});

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