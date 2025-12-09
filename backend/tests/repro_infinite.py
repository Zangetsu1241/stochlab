import urllib.request
import json
import sys

def test_infinite_loop():
    url = "http://127.0.0.1:8000/api/v1/heatmap/solve"
    
    # 1. First batch
    params = {
        "alpha": 0.5,
        "dt": 0.0001,
        "dx": 0.01,
        "t_steps": 10,
        "domain": 1.0,
        "init": "pulse",
        "sigma": 0.0,
        "snapshot_interval": 1
    }
    
    print("Requesting Batch 1...")
    data = json.dumps(params).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as resp:
            resp_body = resp.read().decode('utf-8')
            json_resp = json.loads(resp_body)
            frames = json_resp['frames']
            last_frame = frames[-1]
            print(f"Batch 1 success. Last frame length: {len(last_frame)}")
            
            # 2. Second batch
            params["current_state"] = last_frame
            data2 = json.dumps(params).encode('utf-8')
            req2 = urllib.request.Request(url, data=data2, headers={'Content-Type': 'application/json'})
            
            print("Requesting Batch 2 with current_state...")
            with urllib.request.urlopen(req2) as resp2:
                resp2_body = resp2.read().decode('utf-8')
                json_resp2 = json.loads(resp2_body)
                frames2 = json_resp2['frames']
                print(f"Batch 2 success. Received {len(frames2)} frames.")

    except urllib.error.HTTPError as e:
        print(f"Request failed: {e.code} {e.reason}")
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_infinite_loop()
