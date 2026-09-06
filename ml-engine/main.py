import psycopg2
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import os
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from models.routing_model import recommend_hospitals
from models.bed_prediction_model import predict_bed_occupancy
from models.demand_forecast_model import forecast_emergency_demand

app = FastAPI(title="IERBMS ML Engine")

class HospitalData(BaseModel):
    id: str
    latitude: float
    longitude: float
    occupied_general_beds: int
    total_general_beds: int
    occupied_icu_beds: int
    total_icu_beds: int
    specialists: List[str] = []
    equipment: dict = {}

class EmergencyCaseRequest(BaseModel):
    ambulance_id: str
    latitude: float
    longitude: float
    trauma_level: int
    emergency_type: str = ""
    hospitals: List[HospitalData]

class BedPredictionRequest(BaseModel):
    target_region: Optional[str] = "Greater Accra & Ashanti"
    forecast_hours: Optional[int] = 24
    hospitals: List[dict] = []

class DemandForecastRequest(BaseModel):
    target_region: Optional[str] = "Greater Accra & Ashanti"
    forecast_hours: Optional[int] = 12

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "ML Engine is running"}

@app.post("/predict/route")
def predict_route(request: EmergencyCaseRequest):
    """
    AI Model 1: Predict optimal hospital routing based on distance, bed capacity, trauma level, and capabilities.
    """
    recommended = recommend_hospitals(
        amb_lat=request.latitude,
        amb_lon=request.longitude,
        trauma_level=request.trauma_level,
        emergency_type=request.emergency_type,
        hospitals=request.hospitals
    )
    return {"recommended_hospitals": recommended}

@app.post("/predict/bed-occupancy")
def predict_beds(request: BedPredictionRequest):
    """
    AI Model 2: Predict 24-hour future bed and ICU availability & saturation risk across hospitals.
    """
    return predict_bed_occupancy(
        hospitals=request.hospitals, 
        forecast_hours=request.forecast_hours or 24
    )

@app.post("/predict/demand-forecast")
def predict_demand(request: DemandForecastRequest):
    """
    AI Model 3: Forecast accident hotspots, surge frequency, and ambulance standby strategies.
    """
    return forecast_emergency_demand(
        target_region=request.target_region or "Greater Accra & Ashanti", 
        hours_ahead=request.forecast_hours or 12
    )

def train_model_job():
    try:
        from train_models import train_routing_model, train_bed_occupancy_model, train_demand_forecast_model
        print("Triggering comprehensive retraining for all 3 AI models...")
        train_routing_model()
        train_bed_occupancy_model()
        train_demand_forecast_model()
        print("All 3 models successfully retrained and saved to weights/!")
    except Exception as e:
        print("Training failed:", e)

@app.post("/train")
def trigger_training(background_tasks: BackgroundTasks):
    """
    Triggers a background job to retrain all 3 ML models (Routing, Bed Occupancy, Demand Forecasting).
    """
    background_tasks.add_task(train_model_job)
    return {"status": "ok", "message": "Training job for all 3 AI models started in the background"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
