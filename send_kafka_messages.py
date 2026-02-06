import json
import subprocess
import time

messages = [
    {"userId": "user_100", "action": "page_view", "timestamp": "2026-02-06T13:00:00Z"},
    {"userId": "user_200", "action": "button_click", "timestamp": "2026-02-06T13:00:05Z"},
    {"userId": "user_300", "action": "form_submit", "timestamp": "2026-02-06T13:00:10Z"},
    {"userId": "user_400", "action": "api_call", "timestamp": "2026-02-06T13:00:15Z"},
    {"userId": "user_500", "action": "data_export", "timestamp": "2026-02-06T13:00:20Z"},
]

for msg in messages:
    msg_json = json.dumps(msg)
    cmd = f'docker exec kafka bash -c \'echo "{msg_json}" | kafka-console-producer --broker-list localhost:29092 --topic user-activity\''
    subprocess.run(cmd, shell=True)
    print(f"✅ Sent: {msg_json}")
    time.sleep(0.5)

print("\n🎉 All 5 messages sent to Kafka!")
