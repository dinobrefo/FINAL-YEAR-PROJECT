import math
import os
import joblib
import pandas as pd

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
    Checks relative to current working directory and relative to script directory.
    """
    if os.path.exists(weights_path):
        try:
            return joblib.load(weights_path)
        except Exception as e:
            print(f"Error loading ML model from {weights_path}: {e}")
            
    # Try directory relative to this file's parent's parent (ml-engine base dir)
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    alt_path = os.path.join(base_dir, weights_path)
    if os.path.exists(alt_path):
        try:
            return joblib.load(alt_path)
        except Exception as e:
            print(f"Error loading ML model from {alt_path}: {e}")
            
    return None

def recommend_hospitals(amb_lat, amb_lon, trauma_level, emergency_type, hospitals, weights_path="weights/routing_model.pkl"):
    """
    Evaluates and ranks nearby hospitals using a hybrid guardrail decision system.
    1. Filter out hospitals using hard safety rules (distance, bed capacity).
    2. Score hospitals using a trained RandomForestRegressor model to predict resolution time + estimated travel time.
    3. Fall back to original rule-based capacity scoring if the ML model is not available or fails.
    4. Deduct penalties for missing required specialists or equipment.
    """
    scored_hospitals = []
    req_specialists, req_equipment = get_required_resources(emergency_type)
    
    # Try loading the ML model
    model = load_ml_model(weights_path)
    
    for h in hospitals:
        distance_km = calculate_distance(amb_lat, amb_lon, h.latitude, h.longitude)
        
        # Calculate occupancy parameters
        general_capacity = (h.total_general_beds - h.occupied_general_beds) / (h.total_general_beds or 1)
        icu_capacity = (h.total_icu_beds - h.occupied_icu_beds) / (h.total_icu_beds or 1)
        
        # Check specialist suitability
        specialists_match = True
        if req_specialists:
            hospital_specialists = [s.lower() for s in (h.specialists or [])]
            specialists_match = any(req_s.lower() in hospital_specialists for req_s in req_specialists)
            
        # Check equipment suitability
        equipment_match = True
        if req_equipment and h.equipment:
            for eq in req_equipment:
                if h.equipment.get(eq, 0) <= 0:
                    equipment_match = False
                    break
        
        # 1. Hard safety rules first
        if distance_km > 60.0:
            score = -99999
        elif trauma_level >= 4 and icu_capacity <= 0:
            score = -99999
        elif trauma_level < 4 and general_capacity <= 0:
            score = -99999
        else:
            # Determine base score using ML if available, otherwise fallback to rule-based logic
            ml_predicted = False
            predicted_res_time = 0.0
            
            if model is not None:
                try:
                    # Feature engineering: occupancy_rate (general bed occupancy rate)
                    occupancy_rate = h.occupied_general_beds / (h.total_general_beds or 1)
                    # Create DataFrame with exact column names expected by RandomForestRegressor
                    features = pd.DataFrame([[trauma_level, occupancy_rate]], columns=['trauma_level', 'occupancy_rate'])
                    predicted_res_time = float(model.predict(features)[0])
                    ml_predicted = True
                except Exception as e:
                    print(f"ML Prediction failed for hospital {h.id}: {e}")
            
            if ml_predicted:
                # Travel time estimate: distance_km * 1.5 (assuming ~40 km/h average speed in city traffic)
                estimated_travel_time = distance_km * 1.5
                total_estimated_time = estimated_travel_time + predicted_res_time
                # Base score: 100 minus total estimated time (higher is better, ideal case is 0 mins -> 100)
                base_score = 100.0 - total_estimated_time
            else:
                # Fallback to rule-based logic
                capacity = icu_capacity if trauma_level >= 4 else general_capacity
                base_score = (capacity * 100) - (distance_km * 2.5)
            
            # Apply resource penalties (same for both ML and fallback to maintain consistency)
            resource_penalty = 0
            if not specialists_match:
                resource_penalty += 50
            if not equipment_match:
                resource_penalty += 50
                
            score = base_score - resource_penalty
            
        scored_hospitals.append({
            "hospital_id": h.id,
            "score": round(score, 2),
            "distance_estimate": round(distance_km, 2),
            "ml_used": ml_predicted if (score > -99999) else False
        })
        
    # Sort by highest score first
    scored_hospitals.sort(key=lambda x: x['score'], reverse=True)
    return scored_hospitals
