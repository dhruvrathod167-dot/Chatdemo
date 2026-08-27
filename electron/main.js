const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let serverProcess;
let pythonProcess;
let mainWindow;

function checkPort(port, maxAttempts = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const check = () => {
      attempts++;
      const req = http.request(`http://localhost:${port}`, { method: 'HEAD', timeout: 1000 }, (res) => {
        resolve();
      });
      
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error(`Port ${port} is not available after ${maxAttempts} attempts`));
        } else {
          setTimeout(check, interval);
        }
      });
      
      req.end();
    };
    
    check();
  });
}

function startNextServer() {
  console.log('Starting Next.js server...');
  const serverPath = path.join(__dirname, '..', '.next', 'standalone', 'server.js');
  serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: 3000 },
    stdio: 'inherit',
  });
  
  serverProcess.on('error', (err) => {
    console.error('Next.js server error:', err);
  });
  
  serverProcess.on('exit', (code) => {
    console.log(`Next.js server exited with code ${code}`);
  });
}

function startPythonBackend() {
  console.log('Starting Python backend...');
  const backendPath = path.join(__dirname, '..', 'nova-ai', 'backend');
  
  pythonProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000'], {
    cwd: backendPath,
    env: { ...process.env, PYTHONPATH: backendPath },
    stdio: 'inherit',
  });
  
  pythonProcess.on('error', (err) => {
    console.error('Python backend error:', err);
  });
  
  pythonProcess.on('exit', (code) => {
    console.log(`Python backend exited with code ${code}`);
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    show: false // Don't show window until server is ready
  });

  // Wait for Next.js server to be ready
  try {
    console.log('Waiting for Next.js server to start...');
    await checkPort(3000);
    console.log('Next.js server is ready!');
    
    // Wait for Python backend to be ready (optional)
    try {
      console.log('Waiting for Python backend to start...');
      await checkPort(8000);
      console.log('Python backend is ready!');
    } catch (err) {
      console.warn('Python backend not available, continuing without it:', err.message);
    }
    
    // Load the root page (which will redirect to /chat)
    console.log('Loading root page...');
    await mainWindow.loadURL('http://localhost:3000');
    
    // Show window when content is loaded
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      console.log('Window is ready!');
    });
    
  } catch (err) {
    console.error('Failed to start servers:', err);
    // Show error in window
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
    mainWindow.show();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startNextServer();
  startPythonBackend();
  
  // Small delay to let servers start
  setTimeout(() => {
    createWindow();
  }, 2000);
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    console.log('Stopping Next.js server...');
    serverProcess.kill();
  }
  if (pythonProcess) {
    console.log('Stopping Python backend...');
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    console.log('Stopping Next.js server...');
    serverProcess.kill();
  }
  if (pythonProcess) {
    console.log('Stopping Python backend...');
    pythonProcess.kill();
  }
});