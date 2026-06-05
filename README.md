# Intelligent Emergency Routing & Bed Management System (IERBMS)

Welcome to the **IERBMS** repository. This platform is a next-generation monorepo containing a real-time emergency coordinate matching routing engine, a bed capacity manager, and live telemetry tracking for ambulances and hospitals in Ghana.

---

## 🏗️ System Architecture Overview

The application is organized as a monorepo consisting of:
1. **Database:** PostgreSQL (running in a Docker container on port `5433`).
2. **Backend API Server (`/backend`):** Node.js Express server + Socket.IO (running on port `4000`). Handles WebSocket connections, REST APIs, and database transactions.
3. **ML Routing Engine (`/ml-engine`):** Python FastAPI service (running on port `5000`). Calculates optimal hospital matches based on travel distance, bed occupancy, trauma levels, and historical turnaround times.
4. **React Frontend (`/frontend`):** Next-gen Vite + Tailwind React dashboard (running on port `5173`). Uses **Google Maps Platform** for live coordinate tracking, street-level driving route polyline overlays, and telemetry visualizations.

---

## ⚙️ Prerequisites

Ensure you have the following installed on your system:
- **Docker & Docker Compose** (for running PostgreSQL)
- **Node.js (v18+)** & **npm** (for the frontend and backend workspaces)
- **Python (3.10+)** & **pip** (for the ML FastAPI engine)

---

## 🚀 Step-by-Step Start-Up Guide

Follow these steps in separate terminal tabs to run the complete environment:

### Step 1: Start the PostgreSQL Database
Launch the database container. It will automatically load the schema on its first boot:
```bash
docker-compose up -d
```
*Verify that the database is active by listing containers: `docker ps`*

---

### Step 2: Set up & Seed the Backend API
1. **Install root dependencies:**
   ```bash
   npm install
   ```
2. **Seed real hospitals in Ghana:**
   * **Option A (Recommended - Google Places API):**
     ```bash
     node backend/src/db/seed_hospitals_google.js
     ```
   * **Option B (Fallback - OpenStreetMap Overpass API):**
     ```bash
     node backend/src/db/seed_ghana_hospitals.js
     ```
3. **Seed default authentication accounts:**
   ```bash
   node backend/src/db/seed_users.js
   ```
4. **Seed historical cases (for analytics dashboards charts):**
   ```bash
   node backend/src/db/seed_analytics.js
   ```
5. **Start the backend development server:**
   ```bash
   npm run dev:backend
   ```
   *The Express server is now listening on http://localhost:4000*

---

### Step 3: Run the ML Recommendation Engine
1. Navigate to the `ml-engine` directory:
   ```bash
   cd ml-engine
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv env
   source env/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI server:
   ```bash
   python main.py
   ```
   *The FastAPI server is now listening on http://localhost:5000*

---

### Step 4: Configure & Run the Vite Frontend
1. **Configure your Google Maps API Key:**
   Create a `.env` file in the `frontend` folder:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_actual_google_maps_api_key_here
   ```
2. **Start the frontend application:**
   From the project root directory, run:
   ```bash
   npm run dev:frontend
   ```
   *Open http://localhost:5173 in your browser.*

---

## 👤 Default Credentials

Use these default seeded user profiles to test different dashboards on the login page:

| Role | Email | Password |
|---|---|---|
| **System Admin** | `admin@ierbms.gov` | `password123` |
| **Hospital Manager** | `hospital@ierbms.gov` | `password123` |
| **On-Duty Doctor** | `doctor@ierbms.gov` | `password123` |
| **Ambulance Driver** | `ambulance@ierbms.gov` | `password123` |

---

## ⚡ Key Live Telemetry Features to Test

1. **Physical Location Simulation:**
   - Log in as `ambulance@ierbms.gov`.
   - Connect **Device GPS Live**. If you are physically in Kumasi, your device coordinates will update your ambulance unit in PostgreSQL.
2. **Intake & Recommendation Routing:**
   - Click **New Emergency Intake**.
   - Input patient vitals and hit **Get Recommendations**. 
   - The ML engine will query Kumasi hospitals, check real-time bed capacity, and recommend the best local facility (e.g. *Aburaso Health Center* or *Tanoso Community Hospital*).
   - Select **Confirm & Navigate**.
3. **Live Navigation & Map Tracking:**
   - The dashboard Leaflet overlay has been replaced with Google Maps.
   - It draws a real-time, traffic-aware street driving polyline from the ambulance directly to the selected hospital.
   - The background simulator (`backend/src/simulator.js`) will automatically begin driving the ambulance towards the target on the map in 2-second increments.
