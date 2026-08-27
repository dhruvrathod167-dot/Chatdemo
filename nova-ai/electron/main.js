const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const net = require('net');
const os = require('os');

let mainWindow;
let backendProcess = null;

// Function to check if port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createConnection(port, '127.0.0.1');
    tester.setTimeout(1000);
    tester.on('connect', () => {
      tester.destroy();
      resolve(false);
    });
    tester.on('timeout', () => {
      tester.destroy();
      resolve(true);
    });
    tester.on('error', () => {
      resolve(true);
    });
  });
}

// Function to start the backend
async function startBackend() {
  try {
    // Check if port 8001 is available
    const portAvailable = await isPortAvailable(8001);
    if (!portAvailable) {
      console.log('Port 8001 is already in use. Killing existing process...');
      // Try to kill existing process on port 8001
      exec('netstat -ano | findstr :8001', (err, stdout, stderr) => {
        if (stdout) {
          const lines = stdout.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              const parts = line.trim().split(/\s+/);
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(pid)) {
                exec(`taskkill /F /PID ${pid}`, (err) => {
                  if (err) console.log(`Failed to kill process ${pid}:`, err);
                });
              }
            }
          }
        }
      });
    }

    // Get the path to the Python executable and backend directory
    const isDev = process.env.NODE_ENV === 'development';
    let pythonPath, backendDir, appPath;
    
    if (isDev) {
      // Development mode - use the actual backend directory
      backendDir = path.join(__dirname, '..', 'backend');
      pythonPath = path.join(backendDir, 'venv', 'Scripts', 'python.exe');
      appPath = path.join(backendDir, 'app', 'main.py');
    } else {
      // Production mode - use bundled backend
      // Check both asar and regular paths
      const backendDirAsar = path.join(__dirname, 'resources', 'app.asar', 'backend');
      const backendDirRegular = path.join(__dirname, 'backend');
      
      if (fs.existsSync(backendDirAsar)) {
        backendDir = backendDirAsar;
      } else if (fs.existsSync(backendDirRegular)) {
        backendDir = backendDirRegular;
      } else {
        throw new Error(`Backend directory not found. Tried: ${backendDirAsar}, ${backendDirRegular}`);
      }
      
      pythonPath = path.join(backendDir, 'venv', 'Scripts', 'python.exe');
      appPath = path.join(backendDir, 'app', 'main.py');
    }

    console.log('=== Backend Startup Details ===');
    console.log('Mode:', isDev ? 'Development' : 'Production');
    console.log('Backend Directory:', backendDir);
    console.log('Python Path:', pythonPath);
    console.log('App Path:', appPath);
    console.log('Backend Dir Exists:', fs.existsSync(backendDir));
    console.log('Python Executable Exists:', fs.existsSync(pythonPath));
    console.log('App File Exists:', fs.existsSync(appPath));
    console.log('===============================');

    // Verify all required paths exist
    if (!fs.existsSync(backendDir)) {
      throw new Error(`Backend directory not found at: ${backendDir}`);
    }
    if (!fs.existsSync(pythonPath)) {
      throw new Error(`Python executable not found at: ${pythonPath}`);
    }
    if (!fs.existsSync(appPath)) {
      throw new Error(`App file not found at: ${appPath}`);
    }

    // Start the Python backend with uvicorn
    const args = [
      '-m', 'uvicorn',
      'app.main:app',
      '--host', '127.0.0.1',
      '--port', '8001',
      '--reload'  // Add reload for development
    ];

    console.log('Starting backend with command:', `"${pythonPath}" ${args.join(' ')}`);
    console.log('Working directory:', backendDir);

    // Use array format for better security and to handle spaces in paths
    backendProcess = spawn(pythonPath, args, {
      cwd: backendDir,
      stdio: 'pipe',
      shell: false  // Don't use shell to avoid security issues
    });

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString().trim();
      console.log(`Backend stdout: ${output}`);
    });

    backendProcess.stderr.on('data', (data) => {
      const output = data.toString().trim();
      console.error(`Backend stderr: ${output}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
      backendProcess = null;
    });

    backendProcess.on('error', (error) => {
      console.error('Backend spawn error:', error);
      console.error('Error code:', error.code);
      console.error('Error errno:', error.errno);
      console.error('Error syscall:', error.syscall);
      console.error('Error path:', error.path);
      console.error('Error spawnargs:', error.spawnargs);
      backendProcess = null;
    });

    // Wait for backend to be ready
    await waitForBackend(8001);

  } catch (error) {
    console.error('Failed to start backend:', error);
    throw error;
  }
}

// Function to wait for backend to be ready with health check
function waitForBackend(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        // First check if port is available
        const portAvailable = await isPortAvailable(port);
        if (!portAvailable) {
          // Port is in use, now check health endpoint
          const fetch = require('node-fetch');
          try {
            const response = await fetch(`http://127.0.0.1:${port}/healthz`, {
              timeout: 5000
            });
            if (response.ok) {
              clearInterval(interval);
              console.log('Backend health check passed');
              resolve();
              return;
            }
          } catch (healthError) {
            // Health check failed, continue waiting
            console.log(`Health check attempt ${attempts}: ${healthError.message}`);
          }
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error(`Backend did not start within ${maxAttempts * 2} seconds`));
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(error);
        }
      }
    }, 2000);
  });
}

// Function to create the browser window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true
    },
    title: 'NOVA AI Client',
    icon: path.join(__dirname, 'assets', 'icon.png'), // Optional: add an icon
    show: false // Don't show until ready
  });

  // Load the frontend
  const isDev = process.env.NODE_ENV === 'development';
  if (isDev) {
    // Load from local development server
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Load from production build
    const frontendPath = path.join(__dirname, 'dist', 'index.html');
    mainWindow.loadFile(frontendPath);
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Electron app events
app.whenReady().then(async () => {
  try {
    console.log('NOVA AI Client starting...');
    
    // Start the backend
    console.log('Starting backend...');
    await startBackend();
    console.log('Backend started successfully');
    
    // Create the window
    console.log('Creating browser window...');
    createWindow();
    console.log('Browser window created');

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
    
    console.log('NOVA AI Client started successfully');
    
  } catch (error) {
    console.error('Failed to start application:', error);
    
    // Show detailed error dialog
    const errorMessage = `Failed to start NOVA AI Client: ${error.message}\n\nDetails:\n${error.stack || 'No stack trace available'}`;
    dialog.showErrorBox('Application Error', errorMessage);
    
    // Give user a moment to read the error before quitting
    setTimeout(() => {
      app.quit();
    }, 5000);
  }
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    console.log('Terminating backend process...');
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (backendProcess) {
    console.log('Terminating backend process...');
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
});

// IPC handlers
ipcMain.handle('get-backend-status', () => {
  return {
    running: backendProcess !== null,
    pid: backendProcess ? backendProcess.pid : null
  };
});

ipcMain.handle('restart-backend', async () => {
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    backendProcess = null;
  }
  await startBackend();
  return { success: true };
});

ipcMain.handle('show-error-dialog', (event, title, message) => {
  dialog.showErrorBox(title, message);
});