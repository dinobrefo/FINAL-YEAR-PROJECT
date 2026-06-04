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

def recommend_hospitals(amb_lat, amb_lon, trauma_level, hospitals):
    """
    Evaluates and ranks nearby hospitals using multi-criteria decision modeling.
    Incorporates Haversine distance (km), bed availability, and maximum emergency thresholds.
    """
    scored_hospitals = []
    
    for h in hospitals:
        distance_km = calculate_distance(amb_lat, amb_lon, h.latitude, h.longitude)
        
        # Calculate occupancy parameters
        general_capacity = (h.total_general_beds - h.occupied_general_beds) / (h.total_general_beds or 1)
        icu_capacity = (h.total_icu_beds - h.occupied_icu_beds) / (h.total_icu_beds or 1)
        
        score = 0
        
        # 1. Distance constraints: If hospital is further than 60km, it's out of reach for a primary emergency
        if distance_km > 60.0:
            score = -99999
        # 2. Resource check: If case is critical, require ICU beds. If standard, require general beds
        elif trauma_level >= 4:
            if icu_capacity <= 0:
                score = -99999  # Disqualify if no ICU beds are free
            else:
                # Capacity score (0 to 100) minus distance penalty (2.5x per kilometer)
                score = (icu_capacity * 100) - (distance_km * 2.5)
        else:
            if general_capacity <= 0:
                score = -99999  # Disqualify if no general beds are free
            else:
                score = (general_capacity * 100) - (distance_km * 2.5)
                
        scored_hospitals.append({
            "hospital_id": h.id,
            "score": round(score, 2),
            "distance_estimate": round(distance_km, 2)  # Distance in real kilometers!
        })
        
    # Sort by highest score first
    scored_hospitals.sort(key=lambda x: x['score'], reverse=True)
    return scored_hospitals
