const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const exec = promisify(require('child_process').exec);

function startProcess(command, args, options, name) {
  const child = spawn(command, args, {
    ...options,
    env: { ...process.env, NODE_ENV: 'development', ...(options && options.env ? options.env : {}) },
    shell: true
  });

  child.stdout.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`${name}: ${output}`);
    }
  });

  child.stderr.on('data', (data) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`${name} Error: ${output}`);
    }
  });

  child.on('error', (error) => {
    console.error(`❌ ${name} process error:`, error);
  });

  return child;
}


async function devApp() {
  process.env.NODE_ENV = 'development';
  console.log('🚀 Starting NOVA AI Client development mode...');

  const electronDir = path.join(__dirname, 'electron');
  const frontendDir = path.join(__dirname, 'frontend');
  const backendDir = path.join(__dirname, 'backend');

  try {
    // ==========================================
    // STEP 1: Check dependencies
    // ==========================================

    console.log('📦 Checking dependencies...');

    if (!fs.existsSync(path.join(electronDir, 'node_modules'))) {
      console.log('📦 Installing Electron dependencies...');

      await exec('npm.cmd install', {
        cwd: electronDir
      });
    }

    if (!fs.existsSync(path.join(frontendDir, 'node_modules'))) {
      console.log('📦 Installing frontend dependencies...');

      await exec('npm.cmd install', {
        cwd: frontendDir
      });
    }

    // ==========================================
    // STEP 2: Start development environment
    // ==========================================

    console.log('🔧 Starting development environment...');

    // ==========================================
    // BACKEND
    // ==========================================

    console.log('🚀 Starting backend...');

    const pythonExe = fs.existsSync(path.join(backendDir, 'venv', 'Scripts', 'python.exe'))
      ? path.join(backendDir, 'venv', 'Scripts', 'python.exe')
      : 'python';

    const backendProcess = startProcess(
      pythonExe,
      [
        '-m',
        'uvicorn',
        'app.main:app',
        '--host',
        '127.0.0.1',
        '--port',
        '8001',
        '--reload'
      ],
      {
        cwd: backendDir,
        stdio: ['ignore', 'pipe', 'pipe']
      },
      'Backend'
    );

    // Give backend time to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // ==========================================
    // FRONTEND
    // ==========================================

    console.log('🚀 Starting frontend...');

    const frontendProcess = startProcess(
      'npm.cmd',
      ['run', 'dev'],
      {
        cwd: frontendDir,
        stdio: ['ignore', 'pipe', 'pipe']
      },
      'Frontend'
    );

    // Give frontend time to start
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // ==========================================
    // ELECTRON
    // ==========================================

    console.log('⚛️ Starting Electron...');

    const electronProcess = startProcess(
      'npm.cmd',
      ['run', 'start'],
      {
        cwd: electronDir,
        stdio: ['ignore', 'pipe', 'pipe']
      },
      'Electron'
    );

    // ==========================================
    // SUCCESS
    // ==========================================

    console.log('');
    console.log('==============================================');
    console.log('✅ NOVA AI development environment started!');
    console.log('==============================================');
    console.log('📁 Backend:  http://127.0.0.1:8001');
    console.log('📁 Frontend: http://localhost:3000');
    console.log('📁 Electron: Starting...');
    console.log('==============================================');
    console.log('Press Ctrl+C to stop');
    console.log('');

    // ==========================================
    // GRACEFUL SHUTDOWN
    // ==========================================

    const shutdown = () => {
      console.log('');
      console.log('🛑 Shutting down NOVA AI...');

      try {
        backendProcess.kill();
      } catch (error) {
        console.log('Backend already stopped.');
      }

      try {
        frontendProcess.kill();
      } catch (error) {
        console.log('Frontend already stopped.');
      }

      try {
        electronProcess.kill();
      } catch (error) {
        console.log('Electron already stopped.');
      }

      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    console.error('');
    console.error('❌ Development setup failed:');
    console.error(error);
    console.error('');

    process.exit(1);
  }
}

// Start application
devApp();