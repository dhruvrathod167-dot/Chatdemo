import os
import sys
import subprocess
import shutil
from pathlib import Path

def build_backend():
    backend_dir = Path(__file__).parent / ".." / "backend"
    dist_dir = backend_dir / "dist"
    build_dir = backend_dir / "build"
    
    print("Building FastAPI backend with PyInstaller...")
    
    # Clean previous builds
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    if build_dir.exists():
        shutil.rmtree(build_dir)
    
    # Install PyInstaller if not already installed
    try:
        import PyInstaller
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
    
    # PyInstaller command
    cmd = [
        "python",
        "-m",
        "pyinstaller",
        "--onefile",
        "--windowed",  # No console window
        "--name", "backend",
        "--add-data", f"{backend_dir}/app;app",
        "--add-data", f"{backend_dir}/app.db;.",  # Include database
        "--add-data", f"{backend_dir}/uploads;uploads",  # Include uploads directory
        "--distpath", str(dist_dir),
        "--workpath", str(build_dir),
        "--specpath", str(backend_dir),
        str(backend_dir / "app" / "main.py")
    ]
    
    # Add data files
    for data_dir in ["app", "uploads"]:
        data_path = backend_dir / data_dir
        if data_path.exists():
            cmd.extend(["--add-data", f"{data_path};{data_dir}"])
    
    print("Running PyInstaller...")
    subprocess.run(cmd, check=True)
    
    # Copy the backend executable to electron backend directory
    electron_backend_dir = Path(__file__).parent / "backend"
    electron_backend_dir.mkdir(exist_ok=True)
    
    backend_exe = dist_dir / "backend.exe"
    if backend_exe.exists():
        target_path = electron_backend_dir / "backend.exe"
        shutil.copy2(backend_exe, target_path)
        print(f"Backend executable copied to: {target_path}")
    else:
        print("Warning: Backend executable not found after build")
    
    # Clean up
    if dist_dir.exists():
        shutil.rmtree(dist_dir)
    if build_dir.exists():
        shutil.rmtree(build_dir)
    
    print("Backend build completed!")

if __name__ == "__main__":
    build_backend()