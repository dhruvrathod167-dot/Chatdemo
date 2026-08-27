const { spawn } = require('child_process');
const path = require('path');

console.log('Starting NOVA AI Backend...');

// Start the Python backend
const pythonProcess = spawn('python', [
  'run_backend.py'
], {
  cwd: __dirname,
  stdio: 'pipe'
});

pythonProcess.stdout.on('data', (data) => {
  console.log(`Backend: ${data.toString().trim()}`);
});

pythonProcess.stderr.on('data', (data) => {
  console.error(`Backend Error: ${data.toString().trim()}`);
});

pythonProcess.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down...');
  pythonProcess.kill();
  process.exit(0);
});