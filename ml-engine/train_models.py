import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score

def train_routing_model():
    print("==================================================")
    print("Training Model 1: Hospital Turnaround & Resolution Time")
    print("==================================================")
    np.random.seed(42)
    n_samples = 1500

    # Features: trauma_level (1-5), occupancy_rate (0.1 - 1.0)
    trauma = np.random.randint(1, 6, size=n_samples)
    occupancy = np.random.uniform(0.2, 0.98, size=n_samples)

    # Turnaround time formula with noise (severe trauma + high occupancy takes longer)
    # Baseline ~20 mins + trauma*8 mins + occupancy*25 mins + noise
    turnaround = 20.0 + (trauma * 7.5) + (occupancy * 28.0) + np.random.normal(0, 4.0, size=n_samples)
    turnaround = np.clip(turnaround, 15.0, 120.0)

    X = pd.DataFrame({
        'trauma_level': trauma,
        'occupancy_rate': occupancy
    })
    y = turnaround

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    mse = mean_squared_error(y_test, preds)

    os.makedirs("weights", exist_ok=True)
    joblib.dump(model, "weights/routing_model.pkl")
    print(f"✓ Model 1 Trained: R² Score = {r2:.4f}, MSE = {mse:.2f}")
    print("  Saved to weights/routing_model.pkl\n")
    return model

def train_bed_occupancy_model():
    print("==================================================")
    print("Training Model 2: 24-Hour Predictive Bed Occupancy")
    print("==================================================")
    np.random.seed(101)
    n_samples = 2500

    # Features:
    # current_occupancy_rate (0.2 - 0.95)
    # hour_of_day (0 - 23)
    # day_of_week (0 - 6)
    # is_weekend (0 or 1)
    # icu_ratio (0.05 - 0.25)
    curr_occ = np.random.uniform(0.3, 0.95, size=n_samples)
    hour = np.random.randint(0, 24, size=n_samples)
    day = np.random.randint(0, 7, size=n_samples)
    weekend = (day >= 5).astype(int)
    icu_ratio = np.random.uniform(0.08, 0.20, size=n_samples)

    # Next 24h occupancy dynamics:
    # High daytime admissions, lower weekend discharges
    diurnal_surge = np.where((hour >= 8) & (hour <= 18), 0.08, -0.04)
    weekend_factor = np.where(weekend == 1, 0.03, 0.0)
    
    next_24h_occ = curr_occ * 0.85 + diurnal_surge + weekend_factor + np.random.normal(0, 0.03, size=n_samples)
    next_24h_occ = np.clip(next_24h_occ, 0.15, 0.99)

    X = pd.DataFrame({
        'current_occupancy_rate': curr_occ,
        'hour_of_day': hour,
        'day_of_week': day,
        'is_weekend': weekend,
        'icu_ratio': icu_ratio
    })
    y = next_24h_occ

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    mse = mean_squared_error(y_test, preds)

    joblib.dump(model, "weights/bed_occupancy_model.pkl")
    print(f"✓ Model 2 Trained: R² Score = {r2:.4f}, MSE = {mse:.5f}")
    print("  Saved to weights/bed_occupancy_model.pkl\n")
    return model

def train_demand_forecast_model():
    print("==================================================")
    print("Training Model 3: Spatial Emergency Demand & Hotspot Forecaster (All 16 Regions)")
    print("==================================================")
    np.random.seed(202)
    n_samples = 4000

    # Load real Ghana health facility coordinates if available
    geojson_candidates = [
        os.path.join(os.path.dirname(__file__), "..", "data", "hotosm_gha_health_facilities", "health_facilities.geojson"),
        "data/hotosm_gha_health_facilities/health_facilities.geojson",
        "/tmp/gha_health/health_facilities.geojson"
    ]
    real_coords = []
    for gp in geojson_candidates:
        if os.path.exists(gp):
            try:
                import json
                with open(gp) as f:
                    gdata = json.load(f)
                for feat in gdata.get('features', []):
                    geom = feat.get('geometry', {})
                    if geom.get('type') == 'Point' and geom.get('coordinates'):
                        coords = geom['coordinates']
                        real_coords.append((coords[1], coords[0]))
                    elif geom.get('type') == 'Polygon' and geom.get('coordinates'):
                        ring = geom['coordinates'][0]
                        if ring:
                            lng = sum(p[0] for p in ring) / len(ring)
                            lat = sum(p[1] for p in ring) / len(ring)
                            real_coords.append((lat, lng))
                print(f"  Ingested {len(real_coords)} real GPS coordinates across Ghana from {gp}")
                break
            except Exception as e:
                print(f"Warning reading geojson: {e}")

    # Fallback regional anchors if file missing
    if not real_coords:
        real_coords = [
            (5.5600, -0.2100), # Accra
            (6.6970, -1.6240), # Kumasi
            (4.9239, -1.7433), # Sekondi-Takoradi
            (9.4075, -0.8533), # Tamale
            (5.1053, -1.2466), # Cape Coast
            (6.1112, -0.2612), # Koforidua
            (7.3399, -2.3268), # Sunyani
            (6.6118, 0.4703),  # Ho
            (10.7856, -0.8514),# Bolgatanga
            (10.0601, -2.5099) # Wa
        ]

    lats = []
    lngs = []
    base_risks = []
    for _ in range(n_samples):
        c_lat, c_lng = real_coords[np.random.randint(0, len(real_coords))]
        # Slight jitter simulating emergency incidents near population & healthcare clusters
        lats.append(c_lat + np.random.normal(0, 0.015))
        lngs.append(c_lng + np.random.normal(0, 0.015))
        # Urban density weighting: Accra/Kumasi/Takoradi higher baseline risk
        if 5.4 <= c_lat <= 5.8 and -0.4 <= c_lng <= 0.0:
            base_risk = np.random.uniform(70, 95) # Greater Accra
        elif 6.5 <= c_lat <= 7.0 and -1.8 <= c_lng <= -1.4:
            base_risk = np.random.uniform(65, 90) # Ashanti
        elif 4.8 <= c_lat <= 5.2 and -1.9 <= c_lng <= -1.6:
            base_risk = np.random.uniform(60, 85) # Western (Takoradi)
        elif 9.2 <= c_lat <= 9.6:
            base_risk = np.random.uniform(55, 80) # Northern (Tamale)
        else:
            base_risk = np.random.uniform(40, 75)
        base_risks.append(base_risk)

    lats = np.array(lats)
    lngs = np.array(lngs)
    base_risks = np.array(base_risks)

    hour = np.random.randint(0, 24, size=n_samples)
    is_rush = (((hour >= 7) & (hour <= 9)) | ((hour >= 16) & (hour <= 19))).astype(int)

    # Incident density and rush hour surge
    risk_score = base_risks * 0.70 + (is_rush * 25.0) + np.random.normal(0, 4.0, size=n_samples)
    risk_score = np.clip(risk_score, 10.0, 100.0)

    X = pd.DataFrame({
        'latitude': lats,
        'longitude': lngs,
        'hour_of_day': hour,
        'is_rush_hour': is_rush
    })
    y = risk_score

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)

    preds = model.predict(X_test)
    r2 = r2_score(y_test, preds)
    mse = mean_squared_error(y_test, preds)

    joblib.dump(model, "weights/demand_forecast_model.pkl")
    print(f"✓ Model 3 Trained: R² Score = {r2:.4f}, MSE = {mse:.2f}")
    print("  Saved to weights/demand_forecast_model.pkl\n")
    return model

if __name__ == "__main__":
    train_routing_model()
    train_bed_occupancy_model()
    train_demand_forecast_model()
    print("==================================================")
    print("ALL 3 AI MODELS TRAINED AND SAVED SUCCESSFULLY!")
    print("==================================================")
