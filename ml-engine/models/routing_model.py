import math
import os
import time
import joblib
import pandas as pd
import requests
from datetime import datetime

# High-Speed In-Memory TTL Cache for Distance Matrix queries (60-second sliding window)
_DISTANCE_MATRIX_CACHE = {}
_OSRM_MATRIX_CACHE = {}
_MATRIX_CACHE_TTL_SECS = 60.0

def _get_matrix_cache_key(amb_lat, amb_lon, hospitals):
    h_ids = tuple(h.id for h in hospitals[:25])
    return (round(amb_lat, 4), round(amb_lon, 4), h_ids)

def apply_emergency_siren_dynamics(base_duration_mins: float, in_traffic: bool = True, trauma_level: int = 3):
    """
    Emergency Vehicle Dynamics (EVD) & Siren Clearance Model:
    Models real-world ambulance transit speeds operating under lights and sirens (Code 1 / Priority Dispatch).
    - In free-flow/light traffic, intersection preemption and right-of-way yield a 20-26% ETA reduction.
    - In moderate-to-heavy traffic, vehicle parting allows ambulances to make progress faster than static traffic,
      yielding a 12-18% reduction, while accounting for Ghanaian urban bottleneck friction.
    - High-acuity trauma (T4/T5) receives full urgent right-of-way protocol.
    Returns: (siren_duration_mins, clearance_factor)
    """
    if base_duration_mins <= 1.0:
        return base_duration_mins, 1.0

    if in_traffic:
        if trauma_level >= 4:
            clearance_factor = 0.82  # 18% speedup under sirens in traffic
        else:
            clearance_factor = 0.88  # 12% speedup
    else:
        if trauma_level >= 4:
            clearance_factor = 0.74  # 26% speedup in free-flow (intersection preemption)
        else:
            clearance_factor = 0.80  # 20% speedup

    siren_duration = max(1.0, round(base_duration_mins * clearance_factor, 1))
    return siren_duration, clearance_factor

def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Haversine formula to calculate the great-circle distance between two points 
    on the Earth's surface in kilometers.
    """
    R = 6371.0  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def get_traffic_multiplier(hour: int) -> float:
    """
    Returns a mock traffic multiplier based on the hour of the day to estimate realistic travel times.
    Morning rush hour: 7-9 AM (1.8x travel time)
    Evening rush hour: 16-18 PM (1.8x travel time)
    Normal daytime: (1.2x travel time)
    Nighttime: (1.0x travel time)
    """
    if 7 <= hour <= 9:
        return 1.8
    elif 16 <= hour <= 18:
        return 1.8
    elif 9 < hour < 16 or 18 < hour <= 21:
        return 1.2
    return 1.0

def get_google_maps_api_key():
    """
    Safely retrieves the Google Maps API key from environment variables or local .env files.
    Checks GOOGLE_MAPS_API_KEY, VITE_GOOGLE_MAPS_API_KEY, and common project locations.
    """
    key = os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("VITE_GOOGLE_MAPS_API_KEY")
    if key and key.strip():
        return key.strip().strip('"').strip("'")
    
    # Check possible .env file locations
    env_paths = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.getcwd(), "backend", ".env"),
        os.path.join(os.getcwd(), "frontend", ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend", ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", ".env"),
    ]
    for p in env_paths:
        if os.path.exists(p):
            try:
                with open(p, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("GOOGLE_MAPS_API_KEY=") or line.startswith("VITE_GOOGLE_MAPS_API_KEY="):
                            parts = line.split("=", 1)
                            if len(parts) > 1:
                                val = parts[1].strip().strip('"').strip("'")
                                if val:
                                    return val
            except Exception:
                pass
    return None

def get_google_distance_matrix(amb_lat, amb_lon, hospitals, api_key=None):
    """
    Calls Google Maps Distance Matrix API with departure_time=now and traffic_model=best_guess
    to calculate real-time driving durations factoring in live road traffic congestion.
    Returns a dictionary mapping hospital_id -> { "duration_mins": float, "distance_km": float, "in_traffic": bool }.
    Includes 60-second high-speed in-memory TTL caching shield.
    """
    if not hospitals:
        return None

    cache_key = _get_matrix_cache_key(amb_lat, amb_lon, hospitals)
    now = time.time()
    if cache_key in _DISTANCE_MATRIX_CACHE:
        cached_time, cached_data = _DISTANCE_MATRIX_CACHE[cache_key]
        if now - cached_time < _MATRIX_CACHE_TTL_SECS:
            return cached_data

    if not api_key:
        api_key = get_google_maps_api_key()
    if not api_key:
        return None

    # Google allows up to 25 destinations per distance matrix request
    batch_hospitals = hospitals[:25] if len(hospitals) > 25 else hospitals
    destinations = "|".join(f"{h.latitude},{h.longitude}" for h in batch_hospitals)
    origin = f"{amb_lat},{amb_lon}"

    url = "https://maps.googleapis.com/maps/api/distancematrix/json"
    params = {
        "origins": origin,
        "destinations": destinations,
        "mode": "driving",
        "departure_time": "now",
        "traffic_model": "best_guess",
        "key": api_key
    }

    try:
        response = requests.get(url, params=params, timeout=6)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "OK":
                results = {}
                elements = data.get("rows", [{}])[0].get("elements", [])
                for i, h in enumerate(batch_hospitals):
                    if i < len(elements) and elements[i].get("status") == "OK":
                        elem = elements[i]
                        # Prefer duration_in_traffic if available
                        dur_sec = elem.get("duration_in_traffic", {}).get("value") or elem.get("duration", {}).get("value")
                        dist_m = elem.get("distance", {}).get("value")
                        if dur_sec is not None:
                            results[h.id] = {
                                "duration_mins": dur_sec / 60.0,
                                "distance_km": (dist_m / 1000.0) if dist_m is not None else None,
                                "in_traffic": "duration_in_traffic" in elem
                            }
                if results:
                    _DISTANCE_MATRIX_CACHE[cache_key] = (now, results)
                    return results
    except Exception as e:
        print(f"Google Maps Distance Matrix fallback error: {e}")

    return None

def get_osrm_distance_matrix(amb_lat, amb_lon, hospitals):
    """
    Calls the free public OSRM API to get base travel times (driving durations)
    for a batch of hospitals from the ambulance's current location.
    Returns a dictionary mapping hospital_id -> base travel time in minutes.
    Includes 60-second high-speed in-memory TTL caching shield.
    """
    if not hospitals:
        return None

    cache_key = _get_matrix_cache_key(amb_lat, amb_lon, hospitals)
    now = time.time()
    if cache_key in _OSRM_MATRIX_CACHE:
        cached_time, cached_data = _OSRM_MATRIX_CACHE[cache_key]
        if now - cached_time < _MATRIX_CACHE_TTL_SECS:
            return cached_data

    # Coordinate string format for OSRM: lon,lat;lon,lat;lon,lat
    # Cap to first 30 hospitals to prevent HTTP 414 (URI Too Long)
    batch_hospitals = hospitals[:30] if len(hospitals) > 30 else hospitals
    coords = [f"{amb_lon},{amb_lat}"]
    for h in batch_hospitals:
        coords.append(f"{h.longitude},{h.latitude}")
        
    coords_str = ";".join(coords)
    
    # sources=0 (the ambulance)
    # destinations=1;2;3... (the hospitals)
    dest_indices = ";".join(str(i) for i in range(1, len(batch_hospitals) + 1))
    
    url = f"https://router.project-osrm.org/table/v1/driving/{coords_str}?sources=0&destinations={dest_indices}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        if data.get("code") != "Ok":
            return None
            
        durations = data.get("durations", [[]])[0] # durations from source 0 to all destinations
        
        travel_times_mins = {}
        for i, h in enumerate(hospitals):
            if i < len(durations):
                time_secs = durations[i]
                if time_secs is not None:
                    travel_times_mins[h.id] = time_secs / 60.0
                
        if travel_times_mins:
            _OSRM_MATRIX_CACHE[cache_key] = (now, travel_times_mins)
        return travel_times_mins
    except Exception:
        # Fallback cleanly to distance-based mathematical calculation
        return None

def get_required_resources(emergency_type: str):
    """
    Map emergency types to required specialists and equipment.
    """
    specialists = []
    equipment = []
    
    e_type = str(emergency_type or "").lower()
    if "cardiac" in e_type:
        specialists = ["Cardiologist", "Emergency Medicine"]
        equipment = ["ventilators", "oxygenUnits"]
    elif "stroke" in e_type:
        specialists = ["Neurologist"]
        equipment = ["ctScanners"]
    elif "respiratory" in e_type or "asthma" in e_type:
        specialists = ["Pulmonologist", "Emergency Medicine"]
        equipment = ["ventilators", "oxygenUnits"]
    elif "accident" in e_type or "trauma" in e_type or "fracture" in e_type:
        specialists = ["Orthopedic Surgeon", "Trauma Surgeon"]
    
    return specialists, equipment

def load_ml_model(weights_path="weights/routing_model.pkl"):
    """
    Helper to safely load the trained RandomForestRegressor model.
    Checks relative to current working directory, ml-engine subdirectory, and script directory.
    """
    candidates = [
        weights_path,
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), weights_path),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "weights", os.path.basename(weights_path)),
        os.path.join(os.getcwd(), "ml-engine", weights_path),
        os.path.join(os.getcwd(), weights_path)
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return joblib.load(path)
            except Exception as e:
                print(f"Error loading ML model from {path}: {e}")
            
    return None

def recommend_hospitals(amb_lat, amb_lon, trauma_level, emergency_type, hospitals, weights_path="weights/routing_model.pkl", current_hour=None):
    """
    Evaluates and ranks nearby hospitals using a hybrid guardrail decision system.
    1. Filter out hospitals using hard safety rules (distance, bed capacity).
    2. Score hospitals using a trained RandomForestRegressor model to predict resolution time + estimated travel time.
    3. Fall back to original rule-based capacity scoring if the ML model is not available or fails.
    4. Deduct penalties for missing required specialists or equipment.
    5. Clamp scores strictly between 0 and 100 for normalized UI representation.
    """
    scored_hospitals = []
    req_specialists, req_equipment = get_required_resources(emergency_type)
    
    if current_hour is None:
        current_hour = datetime.now().hour
    traffic_multiplier = get_traffic_multiplier(current_hour)
    
    # Multi-tier routing resolution:
    # Tier 1: Google Maps Distance Matrix API (Live traffic condition)
    # Tier 2: OSRM Public Matrix API (Road-snapped + hour-of-day traffic model)
    # Tier 3: Haversine mathematical geodesic calculation
    google_matrix = get_google_distance_matrix(amb_lat, amb_lon, hospitals)
    osrm_travel_times = None
    if not google_matrix:
        osrm_travel_times = get_osrm_distance_matrix(amb_lat, amb_lon, hospitals)
    
    model = load_ml_model(weights_path)
    
    # Vectorized batch prediction of patient turnaround resolution times (sub-millisecond throughput)
    ml_predictions = {}
    if model is not None and hospitals:
        try:
            batch_data = [
                [trauma_level, h.occupied_general_beds / (h.total_general_beds or 1)]
                for h in hospitals
            ]
            batch_df = pd.DataFrame(batch_data, columns=['trauma_level', 'occupancy_rate'])
            preds = model.predict(batch_df)
            for i, h in enumerate(hospitals):
                ml_predictions[h.id] = float(preds[i])
        except Exception as e:
            print(f"Batch ML Prediction fallback: {e}")
    
    for h in hospitals:
        traffic_source = "haversine_estimate"
        if google_matrix and h.id in google_matrix:
            g_data = google_matrix[h.id]
            estimated_travel_time = g_data["duration_mins"]
            if g_data.get("distance_km") is not None:
                distance_km = g_data["distance_km"]
            else:
                distance_km = calculate_distance(amb_lat, amb_lon, h.latitude, h.longitude)
            traffic_source = "google_live_traffic" if g_data.get("in_traffic") else "google_typical_traffic"
        elif osrm_travel_times and h.id in osrm_travel_times:
            distance_km = calculate_distance(amb_lat, amb_lon, h.latitude, h.longitude)
            base_travel_time = osrm_travel_times[h.id]
            estimated_travel_time = base_travel_time * traffic_multiplier
            traffic_source = "osrm_simulated"
        else:
            distance_km = calculate_distance(amb_lat, amb_lon, h.latitude, h.longitude)
            estimated_travel_time = distance_km * 2.5 * traffic_multiplier
            traffic_source = "haversine_estimate"

        # Emergency Vehicle Dynamics (EVD) & Siren Clearance Model
        is_live_traffic = (traffic_source == "google_live_traffic")
        siren_travel_time, clearance_factor = apply_emergency_siren_dynamics(
            base_duration_mins=estimated_travel_time,
            in_traffic=is_live_traffic,
            trauma_level=trauma_level
        )
        siren_savings = max(0.0, round(estimated_travel_time - siren_travel_time, 1))

        avail_gen = max(0, h.total_general_beds - h.occupied_general_beds)
        avail_icu = max(0, h.total_icu_beds - h.occupied_icu_beds)
        
        specialists_match = True
        if req_specialists:
            hospital_specialists = [s.lower() for s in (h.specialists or [])]
            specialists_match = any(req_s.lower() in hospital_specialists for req_s in req_specialists)
            
        equipment_match = True
        if req_equipment and h.equipment:
            for eq in req_equipment:
                if h.equipment.get(eq, 0) <= 0:
                    equipment_match = False
                    break
        
        ml_predicted = False
        predicted_res_time = 65.0
        if h.id in ml_predictions:
            predicted_res_time = ml_predictions[h.id]
            ml_predicted = True

        # Multi-Criteria Decision Analysis (MCDA) Scoring Components:
        # 1. Proximity Score (35% weight) - Golden Hour boundary using Siren Travel Time & Geodesic Boundary
        if distance_km <= 60.0 and siren_travel_time <= 60.0:
            # Hybrid distance & siren-time decay
            time_penalty = siren_travel_time / 60.0
            dist_penalty = distance_km / 60.0
            s_dist = max(10.0, 100.0 * (1.0 - (0.6 * time_penalty + 0.4 * dist_penalty)))
        else:
            # Beyond Golden Hour: apply exponential distance decay penalty
            s_dist = max(2.0, 30.0 * (1.0 - (min(distance_km, 200.0) - 60.0) / 140.0))
        
        # 2. Bed Capacity Score (35% weight) - evaluates readiness for critical ICU or general emergency
        if trauma_level >= 4:
            s_cap = 0.0 if avail_icu <= 0 else min(100.0, 50.0 + (avail_icu * 10.0))
        else:
            s_cap = 0.0 if avail_gen <= 0 else min(100.0, 50.0 + (avail_gen * 1.5))
            
        # 3. ML Turnaround & Resolution Efficiency (20% weight) - faster predicted turnaround gives higher score
        s_ml = max(20.0, min(100.0, 100.0 - ((predicted_res_time - 35.0) * 1.2)))
        
        # 4. Specialist & Equipment Match (10% weight)
        s_res = (50.0 if specialists_match else 15.0) + (50.0 if equipment_match else 20.0)
        
        composite_score = (s_dist * 0.35) + (s_cap * 0.35) + (s_ml * 0.20) + (s_res * 0.10)
        
        # Hard clinical safety guardrails:
        # - Hospital beyond Golden Hour radius (60 km) is disqualified (score = 0.0)
        # - Hospital with 0 available beds of required type is strictly disqualified (score = 0.0)
        if distance_km > 60.0 or (trauma_level >= 4 and avail_icu <= 0) or (trauma_level < 4 and avail_gen <= 0):
            score = 0.0
            ml_predicted = False
        else:
            score = round(max(10.0, min(99.0, composite_score)), 1)
            
        scored_hospitals.append({
            "hospital_id": h.id,
            "score": score,
            "distance_estimate": round(distance_km, 2),
            "distance_km": round(distance_km, 2),
            "estimated_travel_time_mins": round(siren_travel_time, 1),
            "normal_travel_time_mins": round(estimated_travel_time, 1),
            "siren_savings_mins": siren_savings,
            "siren_clearance_factor": round(clearance_factor, 2),
            "traffic_source": traffic_source,
            "ml_used": ml_predicted
        })
        
    # Sort: qualified hospitals (score > 0) strictly first, then highest score, then closest distance
    scored_hospitals.sort(key=lambda x: (x['score'] > 0, x['score'], -x['distance_km']), reverse=True)
    return scored_hospitals
