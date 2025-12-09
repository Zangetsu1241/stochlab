import urllib.request
import json
import sys

def test_api():
    url = "http://127.0.0.1:8000/api/v1/heatmap/solve"
    payload = {
        "alpha": 0.5,
        "dt": 0.0001,
        "dx": 0.01,
        "t_steps": 50,
        "domain": 1.0,
        "init": "pulse",
        "snapshot_interval": 10
    }
    
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status != 200:
                print(f"Error: Status code {response.status}")
                sys.exit(1)
                
            response_body = response.read().decode('utf-8')
            json_response = json.loads(response_body)
            
            frames = json_response.get("frames")
            if not frames:
                print("Error: No frames returned")
                sys.exit(1)
            
            print(f"Success! Received {len(frames)} frames.")
            print(f"Frame 0 length: {len(frames[0])}")
            
    except urllib.error.URLError as e:
        print(f"API Request failed: {e}")
        if hasattr(e, 'read'):
             print(e.read().decode('utf-8'))
        sys.exit(1)

if __name__ == "__main__":
    test_api()
