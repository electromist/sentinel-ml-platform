import requests
import time
import sys

# API Endpoint (Make sure model-serving is running on port 8000)
API_URL = "http://localhost:8000/predict"

def test_user(user_id, action_count):
    print(f"\n👤 Testing User: {user_id}")
    print(f"📊 Activity Count: {action_count}")
    
    payload = {
        "userId": user_id,
        "action_count": action_count
    }
    
    try:
        response = requests.post(API_URL, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            print(f"🔍 Status: {result['status']}")
            print(f"📈 Risk Score: {result['risk_score']}")
            print(f"💡 Recommendation: {result['recommendation']}")
            
            if result['is_anomaly']:
                print("🚨 ALERT: HACKER DETECTED! 🚨")
        else:
            print(f"❌ Error: API returned status code {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to Model Serving API.")
        print("   Make sure the API is running: 'uvicorn model-serving.api.main:app --reload'")

print("="*50)
print("🛡️  SIMULATING SECURITY CHECK")
print("="*50)

# 1. Simulate Normal User
test_user("alice_normal", 5)
time.sleep(1)

# 2. Simulate Hacker (High Activity)
test_user("evil_hacker_99", 50)

print("\n" + "="*50)
