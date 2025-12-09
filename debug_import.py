
import sys
import os

print("Current cwd:", os.getcwd())
print("PYTHONPATH:", os.environ.get("PYTHONPATH"))
print("sys.path:", sys.path)

try:
    import backend
    print("Successfully imported backend:", backend)
except ImportError as e:
    print("Failed to import backend:", e)

try:
    from backend.app.solvers import heat_fd
    print("Successfully imported heat_fd")
except ImportError as e:
    print("Failed to import heat_fd:", e)
