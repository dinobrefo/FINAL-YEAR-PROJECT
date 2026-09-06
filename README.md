# Intelligent Emergency Resource & Bed Management System (IERBMS)

Welcome to the **IERBMS** repository. This platform is an enterprise-grade emergency coordination system for Ghana Health Service (GHS) and the National Ambulance Service (NAS). It combines real-time emergency dispatch matching, predictive bed capacity forecasting, nationwide geospatial tracking across all 16 regions of Ghana, and clinical guardrails.

---

## 🏗️ System Architecture Overview

The application is structured as a monorepo consisting of:

1. **Database:** PostgreSQL (running in Docker or native on port `5434` / `5433` / `5432`) with safe schema auto-migrations.
2. **Backend API Server (`/backend`):** Node.js Express + Socket.IO (port `4000`/`5001`). Handles WebSockets for live ambulance GPS tracking, hospital bed decrement/restoration lifecycles, and RBAC authentication.
3. **AI / ML Engine (`/ml-engine`):** Python FastAPI service (port `5000`) powered by 3 trained Random Forest models:
   - **Model 1 (`routing_model.pkl`):** Predicts hospital turnaround and emergency resolution time ($R^2 = 0.9032$) with clinical guardrail scoring.
   - **Model 2 (`bed_occupancy_model.pkl`):** Forecasts 24-hour bed and ICU saturation rates ($R^2 = 0.9640$) considering diurnal intake surges.
   - **Model 3 (`demand_forecast_model.pkl`):** Spatial Poisson clustering forecaster trained on real GPS coordinates across Ghana ($R^2 = 0.7612$) for proactive ambulance staging.
4. **React Frontend (`/frontend`):** Vite + Tailwind CSS React dashboard (port `5173`).
   - **100% Free Geospatial Navigation Engine:** Powered by **Leaflet + OpenStreetMap + CartoDB + Esri Satellite + OSRM (Open Source Routing Machine)**.
   - **Zero API Key Requirement:** Operates with no Google billing, credit cards, or external key constraints.
   - **Multi-Layer Cartography:** Tactical Dark Matter, Daylight Street Voyager, and Esri High-Resolution Satellite imagery.
   - **Turn-by-Turn Road Snapping:** Snaps to real Ghanaian road networks with live kilometer distance and driving ETA.
   - **Voice Audio HUD Telemetry:** Synthesized voice announcements and emergency alert chimes.

---

## 🇬🇭 Nationwide Ghana Healthcare Dataset (HOTOSM 2026)

The system includes the complete **Humanitarian OpenStreetMap Team (HOTOSM)** health facility registry from the Humanitarian Data Exchange (HDX / UN OCHA):
* **Total Facilities:** **2,500 verified facilities** across all 16 administrative regions of Ghana.
  * **Hospitals:** 465 facilities
  * **Clinics & Health Posts:** 466 facilities
  * **Pharmacies & Dispensaries:** 1,186 facilities
  * **Health Posts & CHPS Zones:** 109 facilities
  * **Specialist & Dental Units:** 87 facilities
* **Dataset Location:** [`data/hotosm_gha_health_facilities/health_facilities.geojson`](data/hotosm_gha_health_facilities/health_facilities.geojson)

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
Launch the database container:
```bash
docker-compose up -d
```
*Verify that the database is active: `docker ps`*

---

### Step 2: Set up & Seed the Backend API
1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Seed all 2,500 real Ghana facilities across all 16 regions:**
   ```bash
   cd backend
   npm run seed:hotosm
   # Or with clear flag:
   node src/db/seed_hotosm_facilities.js --clear
   ```
3. **Seed default authentication accounts:**
   ```bash
   node src/db/seed_users.js
   ```
4. **Seed historical cases (for analytics dashboards):**
   ```bash
   node src/db/seed_analytics.js
   ```
5. **Start the backend development server:**
   ```bash
   npm run dev
   # Or from root: npm run dev:backend
   ```
   *The Express server is now listening on http://localhost:4000 (or http://localhost:5001)*

---

### Step 3: Run the ML Recommendation Engine
1. Navigate to the `ml-engine` directory:
   ```bash
   cd ml-engine
   ```
2. Activate the Python virtual environment:
   ```bash
   source env/bin/activate
   ```
3. *(Optional)* Retrain all 3 AI models on nationwide coordinates:
   ```bash
   python train_models.py
   ```
4. Run verification tests:
   ```bash
   python test_hybrid_routing.py
   python test_models.py
   ```
5. Start the FastAPI server:
   ```bash
   python main.py
   ```
   *The FastAPI server is now listening on http://localhost:5000*

---

### Step 4: Run the Vite Frontend
1. **Zero Configuration Needed:**
   The frontend uses the open-source Leaflet + CartoDB + Esri Satellite mapping engine and does **not** require any Google Maps API keys or subscriptions.
2. **Start the frontend application:**
   ```bash
   npm run dev:frontend
   # Or: cd frontend && npm run dev
   ```
   *Open http://localhost:5173 in your browser.*

---

## 👤 Default User Profiles

Log in to test role-based dashboards:

| Role | Email | Password | Accessible Portal |
|---|---|---|---|
| **System Admin / Command Center** | `admin@ierbms.gov` | `password123` | `/` (Command Center Dispatch) |
| **National Health Authority** | `authority@ierbms.gov` | `password123` | `/authority` (MOH Policy & 16-Region Census) |
| **Hospital Manager** | `hospital@ierbms.gov` | `password123` | `/hospital/:id` (Bed & ER Census) |
| **Emergency Physician / Doctor** | `doctor@ierbms.gov` | `password123` | `/doctor` (Clinical Triage & Notes) |
| **Inpatient Ward Nurse** | `nurse@ierbms.gov` | `password123` | `/nurse` (Bed Allocation & Discharges) |
| **Ambulance Driver / Paramedic** | `ambulance@ierbms.gov` | `password123` | `/ambulance` (Navigation & Patient Vitals) |

---

## ⚡ Key Live Telemetry Features to Test

1. **Nationwide 16-Region Oversight (`/authority`):**
   - Filter by any of Ghana's 16 regions (Greater Accra, Ashanti, Western, Northern, Volta, Central, etc.).
   - View live facility census (Hospitals, Clinics, Pharmacies), bed saturation rates, and 24-hour AI occupancy forecasts.
2. **Free Multi-Layer Geospatial Engine (`LiveMap`):**
   - Toggle between **Tactical Dark Mode**, **Daylight Street View**, and **Esri High-Resolution Satellite View** with zero API keys.
   - Toggle the **🔥 Accident Hotspots Heatmap** to visualize major collision corridors (Circle, Kasoa corridor, Kejetia, Tema Motorway).
   - Use the **Search Bar** to instantly find and fly to any Ghanaian hospital or ambulance.
3. **Turn-by-Turn Road Snapping (OSRM Engine):**
   - Trigger an emergency case dispatch.
   - The map snaps the driving path to real Ghanaian street geometry with driving ETA and distance in kilometers.
4. **Emergency Bed Lifecycle Loop:**
   - When an ambulance marks a patient as **Arrived**, the assigned hospital's occupied beds automatically increment by 1.
   - When the case is marked as **Resolved**, the hospital bed is restored, the ambulance returns to available status, and live WebSocket events broadcast updates across all dashboards.

---

## 🎓 Capstone Defense & Academic Evaluation Suite

For final year project examination, presentation, and viva voce evaluation:

1. **Examiner Live Defense Controller (Floating Bottom Dock):**
   - Click **"Examiner Defense Tour"** at the bottom-right of any dashboard to open the defense drawer.
   - **1-Click Role Switcher:** Instant switching between Paramedic, Doctor, Nurse, Hospital Manager, Health Authority, and Command Center.
   - **4 Automated Defense Scenarios:**
     - *Scenario 1: KNUST Corridor Polytrauma* (Locks to KATH with real road snapping).
     - *Scenario 2: Mass Casualty & ER Saturation Diversion* (Korle Bu saturation diversion to Ridge Hospital).
     - *Scenario 3: Rural Offline Field Resilience* (IndexedDB local queue & auto-sync upon reconnection).
     - *Scenario 4: 24-Hour Regional Bed Surge Forecast* (AI Models 2 & 3 spatial forecasting).

2. **Ghana Health Service (GHS) SATS TEWS Clinical Calculator:**
   - Evaluates patient mobility, pulse, systolic BP, respiratory rate, temperature, AVPU consciousness, and acute trauma modifiers.
   - Outputs official GHS triage priority: **Red** (Resuscitation), **Orange** (Very Urgent), **Yellow** (Urgent), or **Green** (Non-Urgent).

3. **Academic Multi-Model Benchmarking & Ablation Study:**
   - Execute the 5-fold cross-validation suite:
     ```bash
     ./ml-engine/env/bin/python ml-engine/benchmark_models.py
     ```
   - Compares Baseline, OLS Linear Regression, Ridge ($L_2$), Decision Tree, Random Forest, and Gradient Boosting on $R^2$, RMSE, MAE, and inference latency.

4. **Official GHS / Ministry of Health Audit Dossier:**
   - In the **Health Authority Portal** (`/authority`), click **"Official GHS Audit Dossier"** to open and print the statutory PDF dossier formatted with official Republic of Ghana and GHS headers.

5. **Defense Documentation:**
   - Master Capstone Defense Guide & Viva Voce Q&A: [`PROJECT_DEFENSE_DOSSIER.md`](PROJECT_DEFENSE_DOSSIER.md)
   - Formal Mathematical Specification: [`ALGORITHMS.md`](ALGORITHMS.md)

