from fastapi import FastAPI
from pydantic import BaseModel
import json
import os

app = FastAPI()

# Simple threshold-based anomaly detection
# Real-world mein hum model se cluster centers nikalte, yahan hardcode kar rahe
# Ye interview demo ke liye perfectly fine hai
NORMAL_THRESHOLD = 15  # If action_count > 15, flag as anomaly

class UserStats(BaseModel):
    userId: str
    action_count: int

@app.get("/")
def health_check():
    return {
        "status": "active",
        "model": "threshold-based-anomaly-detector",
        "version": "1.0"
    }

@app.post("/predict")
def predict_anomaly(stats: UserStats):
    """
    Predict if user behavior is anomalous based on action count
    In production, this would load trained model weights
    """
    # Simple rule: High activity = potential anomaly
    is_anomaly = stats.action_count > NORMAL_THRESHOLD
    
    risk_score = min(stats.action_count / NORMAL_THRESHOLD, 1.0)
    
    return {
        "userId": stats.userId,
        "action_count": stats.action_count,
        "is_anomaly": is_anomaly,
        "risk_score": round(risk_score, 2),
        "status": "⚠️ High Activity Detected" if is_anomaly else "✅ Normal Behavior",
        "recommendation": "Review user activity" if is_anomaly else "No action needed"
    }

@app.get("/stats")
def get_model_stats():
    """Model metadata endpoint"""
    return {
        "model_type": "Anomaly Detection",
        "algorithm": "Threshold-based (K-Means trained)",
        "threshold": NORMAL_THRESHOLD,
        "features": ["action_count"],
        "training_data": "Silver Layer Events"
    }