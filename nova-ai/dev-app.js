const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const exec = promisify(require('child_process').exec);

async function devApp() {
  console.log('🚀 Starting NOVA AI Client development mode...');
  
  const electronDir = path.join(__dirname, 'electron');
  const frontendDir = path.join(__dirname, 'frontend');
  const backendDir = path.join(__dirname, 'backend');
  
  try {
    // Step 1: Install dependencies if needed
    console.log('📦 Checking dependencies...');
    
    // Check if electron dependencies are installed
    if (!fs.existsSync(path.join(electronDir, 'node_modules'))) {
      console.log('📦 Installing Electron dependencies...');
      await exec('npm install', { cwd: electronDir });
    }
    
    // Check if frontend dependencies are installed
    if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
      console.log('📦 Installing frontend dependencies...');
      await exec('npm install', { cwd: frontendDir });
    }
    
    // Step 2: Start development environment
    console.log('🔧 Starting development environment...');
    
    // Start backend in background
    console.log('🚀 Starting backend...');
    const backendProcess = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8001', '--reload'], {
      cwd: backendDir,
      stdio: 'pipe'
    });
    
    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data.toString().trim()}`);
    });
    
    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data.toString().trim()}`);
    });
    
    // Wait for backend to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start frontend in background
    console.log('🚀 Starting frontend...');
    const frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      stdio: 'pipe'
    });
    
    frontendProcess.stdout.on('data', (data) => {
      console.log(`Frontend: ${data.toString().trim()}`);
    });
    
    frontendProcess.stderr.on('data', (data) => {
      console.error(`Frontend Error: ${data.toString().trim()}`);
    });
    
    // Wait for frontend to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start Electron
    console.log('⚛️ Starting Electron...');
    const electronProcess = spawn('npm', ['run', 'start'], {
      cwd: electronDir,
      stdio: 'pipe'
    });
    
    electronProcess.stdout.on('data', (data) => {
      console.log(`Electron: ${data.toString().trim()}`);
    });
    
    electronProcess.stderr.on('data', (data) => {
      console.error(`Electron Error: ${data.toString().trim()}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('🛑 Shutting down...');
      backendProcess.kill();
      frontendProcess.kill();
      electronProcess.kill();
      process.exit(0);
    });
    
    console.log('✅ Development environment started!');
    console.log('📁 Backend: http://localhost:8001');
    console.log('📁 Frontend: http://localhost:3000');
    console.log('📁 Electron: Main window should open automatically');
    console.log('Press Ctrl+C to stop');
    
  } catch (error) {
    console.error('❌ Development setup failed:', error);
    process.exit(1);
  }
}

// Run the development setup
devApp();