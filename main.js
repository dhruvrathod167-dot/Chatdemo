const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let serverProcess;

function startNextServer() {
  const serverPath = path.join(__dirname, '.next', 'standalone', 'server.js');
  serverProcess = spawn('node', [serverPath], {
    env: { ...process.env, PORT: 3000 },
    stdio: 'inherit',
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  setTimeout(() => {
    win.loadURL('http://localhost:3000');
  }, 2000);
}

app.whenReady().then(() => {
  startNextServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});