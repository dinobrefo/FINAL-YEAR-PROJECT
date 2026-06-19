import sys
import os
import tempfile
import numpy as np
import pandas as pd
import joblib

def print_result(name, status, details=""):
    symbol = "✓" if status else "✗"
    print(f"[{symbol}] {name:<40} {details}")

def test_imports():
    print("\n1. Checking Environment Packages...")
    packages = [
        ("fastapi", "FastAPI web framework"),
        ("uvicorn", "ASGI server"),
        ("sklearn", "Scikit-Learn (Machine Learning)"),
        ("pandas", "Pandas Data Analysis"),
        ("numpy", "NumPy Numerical Computing"),
        ("joblib", "Joblib serialization"),
        ("psycopg2", "PostgreSQL database connector")
    ]
    
    all_ok = True
    for pkg, desc in packages:
        try:
            __import__(pkg)
            print_result(f"Import {pkg}", True, f"({desc} is available)")
        except ImportError as e:
            print_result(f"Import {pkg}", False, f"({desc} failed to import: {e})")
            all_ok = False
            
    return all_ok

def test_routing_model():
    print("\n2. Checking Routing Model Algorithms & Fallbacks...")
    try:
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

        # Set up test cases
        hosp_ok = MockHospital("hosp_ok", 5.65, -0.18, 10, 5, 5, 2, ["Cardiologist", "Emergency Medicine"], {"ventilators": 2, "oxygenUnits": 1})
        hosp_far = MockHospital("hosp_far", 6.3, -0.18, 10, 2, 5, 1, ["Cardiologist"], {"ventilators": 2, "oxygenUnits": 1})
        hosp_full = MockHospital("hosp_full", 5.62, -0.18, 10, 10, 5, 5)
        hospitals = [hosp_ok, hosp_far, hosp_full]
        
        # Test Rule-Based Fallback
        res_fallback = recommend_hospitals(
            amb_lat=5.60, amb_lon=-0.18,
            trauma_level=3,
            emergency_type="cardiac",
            hospitals=hospitals,
            weights_path="non_existent_weights.pkl"
        )
        
        assert len(res_fallback) == 3
        h_ok = next(r for r in res_fallback if r["hospital_id"] == "hosp_ok")
        h_far = next(r for r in res_fallback if r["hospital_id"] == "hosp_far")
        h_full = next(r for r in res_fallback if r["hospital_id"] == "hosp_full")
        
        # Fallback assertions
        assert h_ok["score"] > 0
        assert h_ok["ml_used"] is False
        assert h_far["score"] == -99999
        assert h_full["score"] == -99999
        print_result("Rule-Based Fallback Scoring", True)
        print_result("Distance safety limit (>60km)", True)
        print_result("General capacity limit (0 beds)", True)
        
        # Test ML-Based scoring
        from sklearn.ensemble import RandomForestRegressor
        X = np.array([[1, 0.1], [3, 0.5], [5, 0.9]])
        y = np.array([5.0, 15.0, 35.0])
        dummy_model = RandomForestRegressor(n_estimators=5, random_state=42)
        dummy_model.fit(X, y)
        
        temp_dir = tempfile.gettempdir()
        temp_weights = os.path.join(temp_dir, "test_weights.pkl")
        joblib.dump(dummy_model, temp_weights)
        
        try:
            res_ml = recommend_hospitals(
                amb_lat=5.60, amb_lon=-0.18,
                trauma_level=3,
                emergency_type="cardiac",
                hospitals=hospitals,
                weights_path=temp_weights
            )
            
            h_ok_ml = next(r for r in res_ml if r["hospital_id"] == "hosp_ok")
            h_far_ml = next(r for r in res_ml if r["hospital_id"] == "hosp_far")
            h_full_ml = next(r for r in res_ml if r["hospital_id"] == "hosp_full")
            
            assert h_ok_ml["ml_used"] is True
            assert 50 < h_ok_ml["score"] < 100
            assert h_far_ml["score"] == -99999
            assert h_full_ml["score"] == -99999
            
            print_result("ML-Driven Scoring (resolution prediction)", True)
            print_result("ML Guardrails (distance & occupancy)", True)
        finally:
            if os.path.exists(temp_weights):
                os.remove(temp_weights)
                
        return True
    except Exception as e:
        print_result("Routing model tests", False, f"Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_api_endpoints():
    print("\n3. Checking FastAPI API Endpoint Functions...")
    try:
        # Import App and Request Structures
        from main import predict_route, EmergencyCaseRequest, HospitalData
        
        req = EmergencyCaseRequest(
            ambulance_id="AMB-TEST",
            latitude=5.60,
            longitude=-0.18,
            trauma_level=3,
            emergency_type="cardiac",
            hospitals=[
                HospitalData(
                    id="h_1", latitude=5.65, longitude=-0.18,
                    occupied_general_beds=4, total_general_beds=10,
                    occupied_icu_beds=1, total_icu_beds=5,
                    specialists=["Cardiologist", "Emergency Medicine"],
                    equipment={"ventilators": 2, "oxygenUnits": 1}
                )
            ]
        )
        
        # Invoke endpoint function directly
        res = predict_route(req)
        assert "recommended_hospitals" in res
        assert len(res["recommended_hospitals"]) == 1
        assert res["recommended_hospitals"][0]["hospital_id"] == "h_1"
        assert res["recommended_hospitals"][0]["ml_used"] is False or res["recommended_hospitals"][0]["ml_used"] is True
        
        print_result("FastAPI Endpoint Function /predict/route", True)
        return True
    except Exception as e:
        print_result("FastAPI Endpoint Function /predict/route", False, f"Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("RUNNING ENVIRONMENT TESTS ON ALL MODELS")
    print("=" * 60)
    
    step1 = test_imports()
    step2 = test_routing_model()
    step3 = test_api_endpoints()
    
    print("=" * 60)
    if step1 and step2 and step3:
        print("SUCCESS: All models and environments passed successfully!")
        sys.exit(0)
    else:
        print("FAILED: One or more environment checks failed.")
        sys.exit(1)
