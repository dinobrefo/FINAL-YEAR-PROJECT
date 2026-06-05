import psycopg2
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
import joblib
import os
from fastapi import FastAPI, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from models.routing_model import recommend_hospitals

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

@app.get("/health")
def health_check():
    return {"status": "ok", "message": "ML Engine is running"}

@app.post("/predict/route")
def predict_route(request: EmergencyCaseRequest):
    """
    Predict optimal hospital routing based on variables like distance, bed capacity, trauma level, and clinical capabilities.
    """
    recommended = recommend_hospitals(
        amb_lat=request.latitude,
        amb_lon=request.longitude,
        trauma_level=request.trauma_level,
        emergency_type=request.emergency_type,
        hospitals=request.hospitals
    )
    return {"recommended_hospitals": recommended}

def train_model_job():
    try:
        # Connect to DB
        conn = psycopg2.connect(
            dbname=os.getenv("POSTGRES_DB", "ierbms"),
            user=os.getenv("POSTGRES_USER", "ierbms_user"),
            password=os.getenv("POSTGRES_PASSWORD", "ierbms_password"),
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=os.getenv("POSTGRES_PORT", "5433")
        )
        
        query = """
            SELECT 
                c.trauma_level, 
                h.occupied_general_beds,
                h.total_general_beds,
                EXTRACT(EPOCH FROM (c.resolved_at - c.created_at))/60 as resolution_time_mins
            FROM emergency_cases c
            JOIN hospitals h ON c.assigned_hospital_id = h.id
            WHERE c.status = 'resolved' AND c.resolved_at IS NOT NULL
        """
        
        df = pd.read_sql(query, conn)
        conn.close()
        
        if len(df) < 10:
            print("Not enough data to train (need at least 10 resolved cases)")
            return
            
        df = df.dropna()
        
        # Features: trauma_level, bed_occupancy_rate
        df['occupancy_rate'] = df['occupied_general_beds'] / df['total_general_beds'].replace(0, 1)
        X = df[['trauma_level', 'occupancy_rate']]
        y = df['resolution_time_mins']
        
        model = RandomForestRegressor(n_estimators=50, random_state=42)
        model.fit(X, y)
        
        os.makedirs("weights", exist_ok=True)
        joblib.dump(model, "weights/routing_model.pkl")
        print(f"Model successfully retrained on {len(df)} records and saved!")
        
    except Exception as e:
        print("Training failed:", e)

@app.post("/train")
def trigger_training(background_tasks: BackgroundTasks):
    """
    Triggers a background job to retrain the ML model based on resolved emergency cases in the database.
    """
    background_tasks.add_task(train_model_job)
    return {"status": "ok", "message": "Training job started in the background"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
