const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

const exec = promisify(require('child_process').exec);
const copyFile = promisify(fs.copyFile);
const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);

async function buildApp() {
  console.log('🚀 Starting NOVA AI Client build process...');
  
  const electronDir = path.join(__dirname, 'electron');
  const frontendDir = path.join(__dirname, 'frontend');
  const backendDir = path.join(__dirname, 'backend');
  
  try {
    // Step 1: Build frontend
    console.log('📦 Building frontend...');
    await exec('npm run build', { cwd: frontendDir });
    
    // Step 2: Build frontend for Electron
    console.log('📦 Building frontend for Electron...');
    await exec('npm run build:electron', { cwd: frontendDir });
    
    // Step 3: Build backend
    console.log('🔧 Building backend...');
    await exec('python build-backend.py', { cwd: electronDir });
    
    // Step 4: Build Electron application
    console.log('⚛️ Building Electron application...');
    await exec('npm run build:win', { cwd: electronDir });
    
    console.log('✅ Build completed successfully!');
    console.log('📁 Output files:');
    console.log(`   - Setup: ${path.join(electronDir, 'dist', 'NOVA-AI-Client-Setup.exe')}`);
    console.log(`   - Portable: ${path.join(electronDir, 'dist', 'NOVA-AI-Client.exe')}`);
    
    // Create a simple README for the build
    const readmeContent = `# NOVA AI Client

## Installation
1. Run NOVA-AI-Client-Setup.exe to install the application
2. Or run NOVA-AI-Client.exe for a portable version

## Usage
1. Double-click NOVA AI Client.exe
2. Wait for the application to start (backend and frontend)
3. The chat interface will open automatically
4. Use your existing NOVA AI account or create a new one

## Requirements
- Windows 10 or later
- No additional dependencies required

## Support
For issues, please check the logs in the application data directory.
`;
    
    await writeFile(path.join(electronDir, 'dist', 'README.txt'), readmeContent);
    
    console.log('📄 README.txt created in dist folder');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

// Run the build
buildApp();