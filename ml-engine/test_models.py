from models.bed_prediction_model import predict_bed_occupancy
from models.demand_forecast_model import forecast_emergency_demand

def test_models():
    print("Testing AI Model 2 (Bed Occupancy Predictor)...")
    sample_hospitals = [
        {"id": "h1", "name": "Ridge Hospital", "total_beds": 200, "occupied_beds": 150, "total_icu": 30, "occupied_icu": 25},
        {"id": "h2", "name": "KATH", "total_beds": 500, "occupied_beds": 480, "total_icu": 50, "occupied_icu": 48},
    ]
    res2 = predict_bed_occupancy(sample_hospitals, forecast_hours=24)
    assert res2["status"] == "success"
    assert len(res2["facility_predictions"]) == 2
    assert "projected_general_saturation_pct" in res2["facility_predictions"][0]
    print(f"✓ Model 2 Success! System Status: {res2['summary']['system_status']}")

    print("\nTesting AI Model 3 (Emergency Demand & Hotspot Forecaster)...")
    res3 = forecast_emergency_demand("Greater Accra", hours_ahead=12)
    assert res3["status"] == "success"
    assert len(res3["predicted_hotspots"]) > 0
    assert "incident_type_distribution" in res3
    print(f"✓ Model 3 Success! Predicted {len(res3['predicted_hotspots'])} hotspots.")
    print("All AI Models 2 & 3 verified successfully!")

if __name__ == "__main__":
    test_models()
