import math
import os
import joblib
import pandas as pd
import requests
from datetime import datetime

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

def get_osrm_distance_matrix(amb_lat, amb_lon, hospitals):
    """
    Calls the free public OSRM API to get base travel times (driving durations)
    for a batch of hospitals from the ambulance's current location.
    Returns a dictionary mapping hospital_id -> base travel time in minutes.
    """
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
    
    # Try fetching base OSRM driving durations
    osrm_travel_times = get_osrm_distance_matrix(amb_lat, amb_lon, hospitals)
    
    model = load_ml_model(weights_path)
    
    for h in hospitals:
        distance_km = calculate_distance(amb_lat, amb_lon, h.latitude, h.longitude)
        
        # Calculate base estimated travel time
        if osrm_travel_times and h.id in osrm_travel_times:
            base_travel_time = osrm_travel_times[h.id]
            estimated_travel_time = base_travel_time * traffic_multiplier
        else:
            estimated_travel_time = distance_km * 2.5 * traffic_multiplier

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

        if model is not None:
            try:
                occupancy_rate = h.occupied_general_beds / (h.total_general_beds or 1)
                features = pd.DataFrame([[trauma_level, occupancy_rate]], columns=['trauma_level', 'occupancy_rate'])
                predicted_res_time = float(model.predict(features)[0])
                ml_predicted = True
            except Exception as e:
                print(f"ML Prediction failed for hospital {h.id}: {e}")

        # Multi-Criteria Decision Analysis (MCDA) Scoring Components:
        # 1. Proximity Score (35% weight) - clinical Golden Hour boundary (60 km) with adaptive decay
        if distance_km <= 60.0:
            s_dist = max(10.0, 100.0 * (1.0 - (distance_km / 60.0)))
        else:
            # Beyond Golden Hour: apply distance decay penalty
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
        # - Hospital with 0 available beds of required type is strictly disqualified (score = 0.0)
        # - Hospitals beyond 60 km receive distance penalty scaling
        if (trauma_level >= 4 and avail_icu <= 0) or (trauma_level < 4 and avail_gen <= 0):
            score = 0.0
            ml_predicted = False
        else:
            distance_scale = 1.0 if distance_km <= 60.0 else max(0.25, 1.0 - ((distance_km - 60.0) / 80.0))
            score = round(max(10.0, min(99.0, composite_score * distance_scale)), 1)
            
        scored_hospitals.append({
            "hospital_id": h.id,
            "score": score,
            "distance_estimate": round(distance_km, 2),
            "distance_km": round(distance_km, 2),
            "estimated_travel_time_mins": round(estimated_travel_time, 1),
            "ml_used": ml_predicted
        })
        
    # Sort: qualified hospitals (score > 0) strictly first, then highest score, then closest distance
    scored_hospitals.sort(key=lambda x: (x['score'] > 0, x['score'], -x['distance_km']), reverse=True)
    return scored_hospitals
