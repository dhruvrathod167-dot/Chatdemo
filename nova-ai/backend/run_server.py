import sys
import os
import uvicorn
import argparse

# Ensure the backend directory is in sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Import app.main:app
from app.main import app

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NOVA AI Backend Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host address to bind to")
    parser.add_argument("--port", type=int, default=8001, help="Port to bind to")
    args = parser.parse_args()

    print(f"Starting server on {args.host}:{args.port}...")
    uvicorn.run(app, host=args.host, port=args.port, log_level="info")
