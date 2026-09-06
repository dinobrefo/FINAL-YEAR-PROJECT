import os
import tempfile
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from models.routing_model import recommend_hospitals

class MockHospital:
    def __init__(self, id, lat, lon, gen_total, gen_occ, icu_total, icu_occ, specialists=None, equipment=None):
        self.id = id
        self.latitude = lat
        self.longitude = lon
        self.total_general_beds = gen_total
        self.occupied_general_beds = gen_occ
        self.total_icu_beds = icu_total
        self.occupied_icu_beds = icu_occ
        self.specialists = specialists or []
        self.equipment = equipment or {}

def run_tests():
    print("Starting Hybrid Routing Engine verification tests...")
    
    # Define hospitals for testing
    # Hospital A: close (10km), available beds
    hosp_a = MockHospital(
        id="hosp_a",
        lat=5.62, lon=-0.18,  # Close to ambulance at 5.60, -0.18
        gen_total=10, gen_occ=5,
        icu_total=5, icu_occ=2,
        specialists=["Cardiologist", "Emergency Medicine"],
        equipment={"ventilators": 2, "oxygenUnits": 1}
    )
    
    # Hospital B: far (70km), available beds
    hosp_b = MockHospital(
        id="hosp_b",
        lat=6.3, lon=-0.18,  # ~77 km away
        gen_total=10, gen_occ=2,
        icu_total=5, icu_occ=1,
        specialists=["Cardiologist"],
        equipment={"ventilators": 2, "oxygenUnits": 1}
    )
    
    # Hospital C: close (5km), but full general beds
    hosp_c = MockHospital(
        id="hosp_c",
        lat=5.62, lon=-0.18,
        gen_total=10, gen_occ=10,
        icu_total=5, icu_occ=5
    )
    
    hospitals = [hosp_a, hosp_b, hosp_c]
    
    # -------------------------------------------------------------
    # Test 1: Rule-Based Fallback (No model weights file exists)
    # -------------------------------------------------------------
    print("\n--- Test 1: Rule-Based Fallback ---")
    results = recommend_hospitals(
        amb_lat=5.60, amb_lon=-0.18,
        trauma_level=3,
        emergency_type="cardiac",
        hospitals=hospitals,
        weights_path="non_existent_model.pkl"
    )
    
    # Verify results
    assert len(results) == 3, "Should return 3 hospital recommendations"
    
    # Hosp B is further than 60km -> score should be 0.0 (disqualified)
    hosp_b_res = next(r for r in results if r["hospital_id"] == "hosp_b")
    assert hosp_b_res["score"] == 0.0, f"Hosp B should be disqualified (0.0), got {hosp_b_res['score']}"
    assert hosp_b_res["ml_used"] is False, "Fallback should set ml_used to False"
    
    # Hosp C has 0 available beds for trauma level 3 -> score should be 0.0 (disqualified)
    hosp_c_res = next(r for r in results if r["hospital_id"] == "hosp_c")
    assert hosp_c_res["score"] == 0.0, f"Hosp C should be disqualified (0.0), got {hosp_c_res['score']}"
    
    # Hosp A is close, has capacity, has specialists/equipment -> score should be positive and ml_used=False
    hosp_a_res = next(r for r in results if r["hospital_id"] == "hosp_a")
    assert hosp_a_res["score"] > 0, f"Hosp A should have positive score, got {hosp_a_res['score']}"
    assert hosp_a_res["ml_used"] is False, "Fallback should set ml_used to False"
    print("✓ Test 1 Passed successfully!")
    
    # -------------------------------------------------------------
    # Test 2: Hybrid Scoring with Trained ML Model
    # -------------------------------------------------------------
    print("\n--- Test 2: ML-driven scoring ---")
    
    # Create a temporary dummy model
    # Features: trauma_level, occupancy_rate
    X_train = pd.DataFrame([
        [1, 0.1], [1, 0.9],
        [3, 0.2], [3, 0.8],
        [5, 0.0], [5, 0.9]
    ], columns=['trauma_level', 'occupancy_rate'])
    y_train = np.array([
        5 + 2, 5 + 18,
        15 + 4, 15 + 16,
        25 + 0, 25 + 18
    ])
    
    model = RandomForestRegressor(n_estimators=10, random_state=42)
    model.fit(X_train, y_train)
    
    # Save the dummy model to a temporary file
    temp_dir = tempfile.gettempdir()
    temp_weights_path = os.path.join(temp_dir, "test_routing_model.pkl")
    joblib.dump(model, temp_weights_path)
    
    try:
        results = recommend_hospitals(
            amb_lat=5.60, amb_lon=-0.18,
            trauma_level=3,
            emergency_type="cardiac",
            hospitals=hospitals,
            weights_path=temp_weights_path
        )
        
        # Verify results with ML active
        hosp_a_res = next(r for r in results if r["hospital_id"] == "hosp_a")
        assert hosp_a_res["ml_used"] is True, "Expected ml_used to be True"
        assert 0 < hosp_a_res["score"] <= 100, f"Score out of expected bounds: {hosp_a_res['score']}"
        
        # Hosp B (far) and Hosp C (full) must still be disqualified (0.0) by guardrails
        hosp_b_res = next(r for r in results if r["hospital_id"] == "hosp_b")
        assert hosp_b_res["score"] == 0.0, "Far hospital should still be disqualified by guardrails"
        assert hosp_b_res["ml_used"] is False, "Disqualified hospital should have ml_used as False"
        
        hosp_c_res = next(r for r in results if r["hospital_id"] == "hosp_c")
        assert hosp_c_res["score"] == 0.0, "Full hospital should still be disqualified by guardrails"
        
        print("✓ Test 2 Passed successfully!")
        
    finally:
        # Clean up temporary weights
        if os.path.exists(temp_weights_path):
            os.remove(temp_weights_path)

    # -------------------------------------------------------------
    # Test 3: Production Model (weights/routing_model.pkl)
    # -------------------------------------------------------------
    print("\n--- Test 3: Production Model (weights/routing_model.pkl) ---")
    prod_path = "weights/routing_model.pkl" if os.path.exists("weights/routing_model.pkl") else ("ml-engine/weights/routing_model.pkl" if os.path.exists("ml-engine/weights/routing_model.pkl") else None)
    if prod_path:
        prod_results = recommend_hospitals(
            amb_lat=5.60, amb_lon=-0.18,
            trauma_level=3,
            emergency_type="cardiac",
            hospitals=hospitals,
            weights_path=prod_path
        )
        hosp_a_prod = next(r for r in prod_results if r["hospital_id"] == "hosp_a")
        assert hosp_a_prod["ml_used"] is True, "Expected ml_used to be True with production weights"
        print(f"✓ Test 3 Passed! Production model score: {hosp_a_prod['score']:.2f}")
    else:
        print("Note: weights/routing_model.pkl not found for Test 3")
            
    print("\nAll tests passed successfully! The Hybrid Guardrail Routing Engine functions correctly.")

if __name__ == "__main__":
    run_tests()
