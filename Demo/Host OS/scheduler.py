import paramiko
import json
import xgboost as xgb

KALI_IP = "10.104.51.145"
KALI_USER = "kali"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

ssh.connect(
    hostname="10.104.51.145",
    username="kali",
    password="kali"
)

# ==========================================
# STEP 1: COLLECT KALI RESOURCE INFORMATION
# ==========================================

stdin, stdout, stderr = ssh.exec_command(
    "python3 ~/Project/resource_agent.py"
)

output = stdout.read().decode().strip()

resources = json.loads(output)

print("\nKali Resource Information")
print("-------------------------")
print("CPU      :", resources["cpu_percent"], "%")
print("Memory   :", resources["memory_percent"], "%")
print("Sent     :", resources["network_sent_mb"], "MB")
print("Received :", resources["network_recv_mb"], "MB")


# ==========================================
# STEP 2: PREPARE XGBOOST FEATURES
# ==========================================

network = (
    resources["network_sent_mb"] +
    resources["network_recv_mb"]
)

features = [[
    resources["cpu_percent"],
    resources["memory_percent"],
    network
]]


# ==========================================
# STEP 3: XGBOOST PREDICTION
# ==========================================

model = xgb.XGBRegressor()

# Load your trained model here
# model.load_model("xgboost_model.json")

# prediction = model.predict(features)

# Temporary demonstration
prediction = 1

print("\nXGBoost Decision:", prediction)


# ==========================================
# STEP 4: EXECUTE TASK ON KALI
# ==========================================

if prediction == 1:

    print("\nExecuting task on Kali...")

    stdin, stdout, stderr = ssh.exec_command(
        "bash ~/Project/task.sh"
    )

    result = stdout.read().decode()

    print(result)

else:

    print("\nKali was not selected.")


ssh.close()
