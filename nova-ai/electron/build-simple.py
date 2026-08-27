import os
import shutil
import subprocess
from pathlib import Path

def build_simple():
    electron_dir = Path(__file__).parent
    backend_dir = electron_dir / "backend"
    dist_dir = backend_dir / "dist"
    
    print("Building backend...")
    
    # Clean previous builds
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    
    # Create a simple script that runs the backend
    main_script = backend_dir / "main.py"
    with open(main_script, 'w') as f:
        f.write("""
import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
""")
    
    # Create a simple Python script to run the backend
    main_script = backend_dir / "run_backend.py"
    with open(main_script, 'w') as f:
        f.write("""#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))
import uvicorn
from app.main import app

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
""")
    
    # Create a simple launcher script
    launcher_script = backend_dir / "backend.exe"
    with open(launcher_script, 'w') as f:
        f.write("""@echo off
echo Starting NOVA AI Backend...
python run_backend.py
if errorlevel 1 pause
""")
    
    # Make it executable
    os.chmod(launcher_script, 0o755)
    
    print(f"Backend script created at: {launcher_script}")
    print("You can run this script to start the backend manually.")
    
    # Copy the frontend build
    frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
    if frontend_dist.exists():
        frontend_target = electron_dir / "dist"
        if frontend_target.exists():
            shutil.rmtree(frontend_target)
        shutil.copytree(frontend_dist, frontend_target)
        print(f"Frontend copied to: {frontend_target}")
    else:
        print("Warning: Frontend dist not found. Run 'npm run build:electron' first.")

if __name__ == "__main__":
    build_simple()