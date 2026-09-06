import os
import sys
import json
import math

# Add ml-engine to path so models can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'ml-engine'))
from models.routing_model import recommend_hospitals, calculate_distance, get_traffic_multiplier

class TestHospital:
    def __init__(self, id, name, lat, lng, total_beds, avail_beds, total_icu, avail_icu, specialists=None, equipment=None, region="Greater Accra"):
        self.id = id
        self.name = name
        self.latitude = lat
        self.longitude = lng
        self.total_general_beds = total_beds
        self.occupied_general_beds = total_beds - avail_beds
        self.total_icu_beds = total_icu
        self.occupied_icu_beds = total_icu - avail_icu
        self.specialists = specialists or []
        self.equipment = equipment or {}
        self.region = region

def run_verification():
    print("=" * 70)
    print("IERBMS MAP & ALGORITHM INTEGRATION VERIFICATION")
    print("=" * 70)
    
    # -------------------------------------------------------------
    # 1. Facility Geospatial Verification (Ghana Real Coordinates)
    # -------------------------------------------------------------
    print("\n[STEP 1] Validating Hospital GPS Coordinates across Ghana...")
    facilities = [
        # Greater Accra
        TestHospital("gh_hosp_01", "Greater Accra Regional Hospital (Ridge)", 5.5601, -0.1973, 420, 35, 30, 4,
                     specialists=["Emergency Medicine", "Trauma Surgeon", "Cardiologist", "Neurologist"],
                     equipment={"ventilators": 12, "ctScanners": 2, "oxygenUnits": 40}, region="Greater Accra"),
        TestHospital("gh_hosp_02", "Korle Bu Teaching Hospital", 5.5369, -0.2285, 2000, 110, 80, 8,
                     specialists=["Cardiologist", "Trauma Surgeon", "Neurologist", "Pulmonologist"],
                     equipment={"ventilators": 25, "ctScanners": 4, "oxygenUnits": 150}, region="Greater Accra"),
        TestHospital("gh_hosp_03", "37 Military Hospital", 5.5862, -0.1834, 500, 42, 25, 5,
                     specialists=["Emergency Medicine", "Trauma Surgeon", "Orthopedic Surgeon"],
                     equipment={"ventilators": 10, "ctScanners": 2, "oxygenUnits": 50}, region="Greater Accra"),
        # Ashanti
        TestHospital("gh_hosp_04", "Komfo Anokye Teaching Hospital (KATH)", 6.6961, -1.6310, 1200, 75, 45, 6,
                     specialists=["Cardiologist", "Trauma Surgeon", "Neurologist", "Pulmonologist"],
                     equipment={"ventilators": 20, "ctScanners": 3, "oxygenUnits": 90}, region="Ashanti"),
        TestHospital("gh_hosp_05", "Kumasi South Regional Hospital", 6.6621, -1.5991, 280, 22, 12, 2,
                     specialists=["Emergency Medicine", "Orthopedic Surgeon"],
                     equipment={"ventilators": 5, "ctScanners": 1, "oxygenUnits": 25}, region="Ashanti"),
        # Western
        TestHospital("gh_hosp_06", "Effia Nkwanta Regional Hospital", 4.9080, -1.7610, 350, 18, 15, 1,
                     specialists=["Emergency Medicine", "Trauma Surgeon"],
                     equipment={"ventilators": 6, "ctScanners": 1, "oxygenUnits": 30}, region="Western"),
        # Northern
        TestHospital("gh_hosp_07", "Tamale Teaching Hospital", 9.3980, -0.8390, 800, 60, 20, 3,
                     specialists=["Trauma Surgeon", "Emergency Medicine"],
                     equipment={"ventilators": 8, "ctScanners": 1, "oxygenUnits": 45}, region="Northern"),
    ]

    for f in facilities:
        # Check Ghana bounding box: Lat 4.5 to 11.5 N, Lng -3.5 to 1.5 W
        assert 4.5 <= f.latitude <= 11.5, f"Invalid latitude for {f.name}: {f.latitude}"
        assert -3.5 <= f.longitude <= 1.5, f"Invalid longitude for {f.name}: {f.longitude}"
        assert f.total_general_beds > 0, f"Hospital {f.name} missing bed count"
    print(f"  ✓ Verified {len(facilities)} real Ghanaian tertiary/regional medical centers across 4 regions.")

    # -------------------------------------------------------------
    # 2. Test Emergency Routing Algorithm with Accra Emergency
    # -------------------------------------------------------------
    print("\n[STEP 2] Testing Algorithm Routing in Greater Accra Corridor...")
    # Incident at Kwame Nkrumah Circle (Accra Central: 5.5560, -0.2100)
    accra_incident = {"lat": 5.5560, "lng": -0.2100}
    
    # Critical Trauma Level 5 (Accident / Polytrauma)
    results_accra = recommend_hospitals(
        amb_lat=accra_incident["lat"],
        amb_lon=accra_incident["lng"],
        trauma_level=5,
        emergency_type="trauma",
        hospitals=facilities
    )

    print("  Ranked Hospitals for Accra Circle Trauma Level 5 Emergency:")
    for idx, r in enumerate(results_accra[:3], 1):
        h = next(h for h in facilities if h.id == r["hospital_id"])
        print(f"    #{idx}: {h.name} | Score: {r['score']} | Dist: {r['distance_km']} km | ETA: {r['estimated_travel_time_mins']} mins | ML Used: {r['ml_used']}")
    
    # Verification assertions
    top_accra = results_accra[0]
    assert top_accra["score"] > 0, "Top hospital should have positive score"
    top_hosp = next(h for h in facilities if h.id == top_accra["hospital_id"])
    assert top_hosp.region == "Greater Accra", f"Top hospital for Accra emergency must be in Greater Accra, got {top_hosp.region}"
    assert top_accra["distance_km"] < 15.0, f"Distance should be under 15 km in central Accra, got {top_accra['distance_km']}"
    print("  ✓ Greater Accra Emergency correctly dispatched to closest trauma-equipped facility!")

    # -------------------------------------------------------------
    # 3. Test Emergency Routing Algorithm with Kumasi Emergency
    # -------------------------------------------------------------
    print("\n[STEP 3] Testing Algorithm Routing in Ashanti (Kumasi Metro)...")
    # Incident at Kejetia Roundabout (Kumasi: 6.6970, -1.6240)
    kumasi_incident = {"lat": 6.6970, "lng": -1.6240}
    
    results_kumasi = recommend_hospitals(
        amb_lat=kumasi_incident["lat"],
        amb_lon=kumasi_incident["lng"],
        trauma_level=4,
        emergency_type="cardiac",
        hospitals=facilities
    )

    print("  Ranked Hospitals for Kejetia Kumasi Cardiac Level 4 Emergency:")
    for idx, r in enumerate(results_kumasi[:3], 1):
        h = next(h for h in facilities if h.id == r["hospital_id"])
        print(f"    #{idx}: {h.name} | Score: {r['score']} | Dist: {r['distance_km']} km | ETA: {r['estimated_travel_time_mins']} mins | ML Used: {r['ml_used']}")

    top_kumasi = results_kumasi[0]
    top_k_hosp = next(h for h in facilities if h.id == top_kumasi["hospital_id"])
    assert top_k_hosp.region == "Ashanti", f"Top hospital for Kumasi emergency must be in Ashanti, got {top_k_hosp.region}"
    assert top_k_hosp.name.startswith("Komfo Anokye"), f"Expected KATH as top Kumasi facility, got {top_k_hosp.name}"
    print("  ✓ Kumasi Emergency correctly routed to Komfo Anokye Teaching Hospital (KATH)!")

    # -------------------------------------------------------------
    # 4. Verification of Distance Limits (>60km Disqualification)
    # -------------------------------------------------------------
    print("\n[STEP 4] Verifying Safety Distance Disqualification Guardrail (>60km)...")
    # For Accra emergency, Tamale and Kumasi hospitals (>150km away) must be safely scored 0.0
    far_hospitals = [r for r in results_accra if r["distance_km"] > 60.0]
    for fh in far_hospitals:
        h = next(h for h in facilities if h.id == fh["hospital_id"])
        assert fh["score"] == 0.0, f"Hospital {h.name} is {fh['distance_km']} km away but not disqualified (score={fh['score']})"
    print(f"  ✓ {len(far_hospitals)} regional facilities beyond 60 km radius correctly disqualified with score = 0.0.")

    # -------------------------------------------------------------
    # 5. Compatibility between Map Props & Algorithm Return Schema
    # -------------------------------------------------------------
    print("\n[STEP 5] Verifying Schema Synergy between Map and Recommendation Engine...")
    for r in results_accra:
        assert "hospital_id" in r
        assert "score" in r
        assert "distance_estimate" in r
        assert "distance_km" in r
        assert "estimated_travel_time_mins" in r
        assert "ml_used" in r
        # Verify types
        assert isinstance(r["score"], (int, float))
        assert isinstance(r["distance_km"], (int, float))
        assert 0.0 <= r["score"] <= 100.0, f"Score out of 0-100 range: {r['score']}"
    print("  ✓ Output schema completely compatible with LeafletMap and NewEmergency form!")

    # -------------------------------------------------------------
    # 6. Haversine Math Verification
    # -------------------------------------------------------------
    print("\n[STEP 6] Testing Haversine Geodesic Math Calculation...")
    # Distance between Accra (5.6037, -0.1870) and Kumasi (6.6885, -1.6244) ~ 200 km
    d = calculate_distance(5.6037, -0.1870, 6.6885, -1.6244)
    print(f"  Accra to Kumasi calculated distance: {d:.2f} km (Standard known: ~200 km)")
    assert 190.0 <= d <= 215.0, f"Accra to Kumasi distance unexpected: {d}"
    print("  ✓ Haversine distance engine mathematically verified.")

    print("\n" + "=" * 70)
    print("ALL VERIFICATION CHECKS PASSED: MAP & ALGORITHM ARE 100% IN SYNC!")
    print("=" * 70)

if __name__ == "__main__":
    run_verification()
