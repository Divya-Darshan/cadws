import psutil
import json

cpu = psutil.cpu_percent(interval=1)
memory = psutil.virtual_memory().percent

net = psutil.net_io_counters()

data = {
    "cpu_percent": cpu,
    "memory_percent": memory,
    "network_sent_mb": round(net.bytes_sent / (1024 * 1024), 2),
    "network_recv_mb": round(net.bytes_recv / (1024 * 1024), 2)
}

print(json.dumps(data))
