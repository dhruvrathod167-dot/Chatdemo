const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');

let serverProcess;
let pythonProcess;
let mainWindow;

const userDataPath = app.getPath('userData');
const dbDir = path.join(userDataPath, 'db');

// Ensure db directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const prodCustomDbPath = path.join(dbDir, 'custom.db');
const prodNovaDbPath = path.join(dbDir, 'nova_ai.db');

// Helper to copy seed databases on first launch
function initDatabases() {
  console.log('Initializing databases in UserData folder:', dbDir);

  // 1. Copy custom.db (Frontend Prisma)
  if (!fs.existsSync(prodCustomDbPath)) {
    const seedCustomDbPath = app.isPackaged
      ? path.join(process.resourcesPath, 'db', 'custom.db')
      : path.join(__dirname, '..', 'db', 'custom.db');

    if (fs.existsSync(seedCustomDbPath)) {
      fs.copyFileSync(seedCustomDbPath, prodCustomDbPath);
      console.log('Copied seed custom.db to:', prodCustomDbPath);
    } else {
      console.warn('Seed custom.db not found at:', seedCustomDbPath);
    }
  } else {
    console.log('Existing custom.db found at:', prodCustomDbPath);
  }

  // 2. Copy nova_ai.db (FastAPI backend)
  if (!fs.existsSync(prodNovaDbPath)) {
    const seedNovaDbPath = app.isPackaged
      ? path.join(process.resourcesPath, 'db', 'nova_ai.db')
      : path.join(__dirname, '..', 'nova-ai', 'backend', 'nova_ai.db');

    if (fs.existsSync(seedNovaDbPath)) {
      fs.copyFileSync(seedNovaDbPath, prodNovaDbPath);
      console.log('Copied seed nova_ai.db to:', prodNovaDbPath);
    } else {
      console.warn('Seed nova_ai.db not found at:', seedNovaDbPath);
    }
  } else {
    console.log('Existing nova_ai.db found at:', prodNovaDbPath);
  }
}

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
  
  // Format sqlite database URL for Windows/macOS absolute paths
  const dbUrl = `file:${prodCustomDbPath.replace(/\\/g, '/')}`;
  console.log('Next.js standalone database URL:', dbUrl);

  serverProcess = spawn('node', [serverPath], {
    env: { 
      ...process.env, 
      PORT: 3000,
      DATABASE_URL: dbUrl
    },
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
  
  let backendBin;
  let backendArgs;
  const backendPath = path.join(__dirname, '..', 'nova-ai', 'backend');

  if (app.isPackaged) {
    // In production, we run the compiled PyInstaller binary from resources
    const binName = process.platform === 'win32' ? 'backend.exe' : 'backend';
    backendBin = path.join(process.resourcesPath, 'bin', binName);
    backendArgs = ['--host', '127.0.0.1', '--port', '8000'];
  } else {
    // In development, run using the local python environment
    backendBin = 'python';
    backendArgs = [path.join(backendPath, 'run_server.py'), '--host', '127.0.0.1', '--port', '8000'];
  }

  const dbUrl = `sqlite+aiosqlite:///${prodNovaDbPath.replace(/\\/g, '/')}`;
  const uploadDir = path.join(userDataPath, 'uploads');
  
  console.log('Spawning backend:', backendBin, backendArgs.join(' '));
  console.log('Backend DATABASE_URL:', dbUrl);
  console.log('Backend UPLOAD_DIR:', uploadDir);

  pythonProcess = spawn(backendBin, backendArgs, {
    cwd: app.isPackaged ? undefined : backendPath,
    env: { 
      ...process.env, 
      DATABASE_URL: dbUrl,
      UPLOAD_DIR: uploadDir
    },
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
    
    // Wait for Python backend to be ready
    try {
      console.log('Waiting for Python backend to start...');
      await checkPort(8000);
      console.log('Python backend is ready!');
    } catch (err) {
      console.warn('Python backend not available, continuing without it:', err.message);
    }
    
    // Load the root page
    console.log('Loading root page...');
    await mainWindow.loadURL('http://localhost:3000');
    
    // Show window when content is loaded
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      console.log('Window is ready!');
    });
    
  } catch (err) {
    console.error('Failed to start servers:', err);
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
    mainWindow.show();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Ensure databases are set up first
  initDatabases();

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