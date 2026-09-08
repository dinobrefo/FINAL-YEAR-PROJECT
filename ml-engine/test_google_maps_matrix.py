import os
import unittest
from unittest.mock import patch, MagicMock
from models.routing_model import (
    get_google_maps_api_key,
    get_google_distance_matrix,
    recommend_hospitals
)

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

class TestGoogleMapsMatrix(unittest.TestCase):
    def setUp(self):
        self.hosp1 = MockHospital("hosp_1", 5.61, -0.18, 10, 2, 5, 1, ["Cardiologist"], {"ventilators": 1})
        self.hosp2 = MockHospital("hosp_2", 5.65, -0.19, 10, 3, 5, 2, ["Cardiologist"], {"ventilators": 1})
        self.hospitals = [self.hosp1, self.hosp2]

    def test_fallback_when_no_api_key(self):
        # Without key, returns None and falls back to OSRM / Haversine
        matrix = get_google_distance_matrix(5.60, -0.18, self.hospitals, api_key=None)
        if not get_google_maps_api_key():
            self.assertIsNone(matrix)

    @patch("requests.get")
    def test_google_distance_matrix_success_with_live_traffic(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "status": "OK",
            "rows": [
                {
                    "elements": [
                        {
                            "status": "OK",
                            "distance": {"value": 5200, "text": "5.2 km"},
                            "duration": {"value": 720, "text": "12 mins"},
                            "duration_in_traffic": {"value": 900, "text": "15 mins"}
                        },
                        {
                            "status": "OK",
                            "distance": {"value": 8100, "text": "8.1 km"},
                            "duration": {"value": 960, "text": "16 mins"},
                            "duration_in_traffic": {"value": 1200, "text": "20 mins"}
                        }
                    ]
                }
            ]
        }
        mock_get.return_value = mock_resp

        results = get_google_distance_matrix(5.60, -0.18, self.hospitals, api_key="test_dummy_key")
        self.assertIsNotNone(results)
        self.assertIn("hosp_1", results)
        self.assertEqual(results["hosp_1"]["duration_mins"], 15.0)  # 900s / 60
        self.assertEqual(results["hosp_1"]["distance_km"], 5.2)
        self.assertTrue(results["hosp_1"]["in_traffic"])

    @patch("models.routing_model.get_google_distance_matrix")
    def test_recommend_hospitals_uses_google_live_traffic(self, mock_matrix):
        mock_matrix.return_value = {
            "hosp_1": {"duration_mins": 14.5, "distance_km": 4.8, "in_traffic": True},
            "hosp_2": {"duration_mins": 22.0, "distance_km": 9.2, "in_traffic": True}
        }

        recs = recommend_hospitals(
            amb_lat=5.60,
            amb_lon=-0.18,
            trauma_level=3,
            emergency_type="cardiac",
            hospitals=self.hospitals,
            weights_path="non_existent.pkl"
        )

        self.assertEqual(len(recs), 2)
        h1 = next(r for r in recs if r["hospital_id"] == "hosp_1")
        self.assertEqual(h1["traffic_source"], "google_live_traffic")
        self.assertEqual(h1["estimated_travel_time_mins"], 12.8) # Siren-adjusted ETA
        self.assertEqual(h1["normal_travel_time_mins"], 14.5)     # Unadjusted consumer car ETA
        self.assertEqual(h1["siren_savings_mins"], 1.7)
        self.assertEqual(h1["distance_km"], 4.8)

if __name__ == "__main__":
    unittest.main()
