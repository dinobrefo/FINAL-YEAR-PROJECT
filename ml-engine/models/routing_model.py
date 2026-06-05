import math

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

def recommend_hospitals(amb_lat, amb_lon, trauma_level, emergency_type, hospitals):
    """
    Evaluates and ranks nearby hospitals using multi-criteria decision modeling.
    Incorporates Haversine distance (km), bed availability, clinical specialist availability, 
    and specialized medical equipment criteria matching.
    """
    scored_hospitals = []
    req_specialists, req_equipment = get_required_resources(emergency_type)
    
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
        
        score = 0
        
        # 1. Distance constraints: If hospital is further than 60km, it's out of reach for a primary emergency
        if distance_km > 60.0:
            score = -99999
        # 2. Resource check: If case is critical, require ICU beds. If standard, require general beds
        elif trauma_level >= 4:
            if icu_capacity <= 0:
                score = -99999  # Disqualify if no ICU beds are free
            else:
                base_score = (icu_capacity * 100) - (distance_km * 2.5)
                # Penalize score for missing critical medical personnel or devices
                resource_penalty = 0
                if not specialists_match:
                    resource_penalty += 50
                if not equipment_match:
                    resource_penalty += 50
                score = base_score - resource_penalty
        else:
            if general_capacity <= 0:
                score = -99999  # Disqualify if no general beds are free
            else:
                base_score = (general_capacity * 100) - (distance_km * 2.5)
                resource_penalty = 0
                if not specialists_match:
                    resource_penalty += 50
                if not equipment_match:
                    resource_penalty += 50
                score = base_score - resource_penalty
                
        scored_hospitals.append({
            "hospital_id": h.id,
            "score": round(score, 2),
            "distance_estimate": round(distance_km, 2)  # Distance in real kilometers!
        })
        
    # Sort by highest score first
    scored_hospitals.sort(key=lambda x: x['score'], reverse=True)
    return scored_hospitals
