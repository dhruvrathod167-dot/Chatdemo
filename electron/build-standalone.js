const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.join(__dirname, '..');
const backendDir = path.join(rootDir, 'nova-ai', 'backend');
const electronBinDir = path.join(__dirname, 'bin');

function runCommand(cmd, cwd = rootDir) {
  console.log(`Running: ${cmd} (in ${cwd})`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function dereferenceSymlinks(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    let stat;
    try {
      stat = fs.lstatSync(fullPath);
    } catch (e) {
      continue; // Skip broken links
    }

    if (stat.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(fullPath);
      const resolvedTarget = path.resolve(dir, linkTarget);
      console.log(`Dereferencing symlink: ${fullPath} -> ${resolvedTarget}`);
      
      // Delete symlink
      fs.unlinkSync(fullPath);
      
      // Copy directory/file to target path
      if (fs.existsSync(resolvedTarget)) {
        fs.cpSync(resolvedTarget, fullPath, { recursive: true, dereference: true });
      } else {
        console.warn(`Target not found for symlink: ${resolvedTarget}`);
      }
    } else if (stat.isDirectory()) {
      dereferenceSymlinks(fullPath);
    }
  }
}

async function build() {
  try {
    console.log('🏁 Starting unified standalone build process...');

    // 1. Build Next.js
    console.log('\n--- Step 1: Building Next.js Frontend ---');
    runCommand('npx prisma generate');
    runCommand('npm run build');

    // 2. Prepare Next.js standalone assets
    console.log('\n--- Step 2: Preparing Next.js standalone assets ---');
    const standaloneDir = path.join(rootDir, '.next', 'standalone');
    const standalonePublic = path.join(standaloneDir, 'public');
    const standaloneStatic = path.join(standaloneDir, '.next', 'static');

    // Copy public directory to standalone
    if (fs.existsSync(path.join(rootDir, 'public'))) {
      console.log('Copying public folder to standalone...');
      fs.cpSync(path.join(rootDir, 'public'), standalonePublic, { recursive: true });
    }

    // Copy .next/static directory to standalone/.next/static
    if (fs.existsSync(path.join(rootDir, '.next', 'static'))) {
      console.log('Copying .next/static folder to standalone...');
      fs.cpSync(path.join(rootDir, '.next', 'static'), standaloneStatic, { recursive: true });
    }

    // Dereference symlinks inside .next/standalone to avoid Windows symlink permission errors
    console.log('Dereferencing symlinks in .next/standalone...');
    dereferenceSymlinks(standaloneDir);

    // 3. Compile Python Backend with PyInstaller
    console.log('\n--- Step 3: Compiling Python Backend via PyInstaller ---');
    
    // Ensure electron/bin directory exists
    if (!fs.existsSync(electronBinDir)) {
      fs.mkdirSync(electronBinDir, { recursive: true });
    }

    const pythonBin = process.platform === 'win32'
      ? path.join(backendDir, 'venv', 'Scripts', 'python.exe')
      : path.join(backendDir, 'venv', 'bin', 'python');

    if (!fs.existsSync(pythonBin)) {
      throw new Error(`Python virtualenv not found at: ${pythonBin}`);
    }

    // Install PyInstaller in the venv if needed
    console.log('Ensuring PyInstaller is installed in the virtualenv...');
    runCommand(`"${pythonBin}" -m pip install pyinstaller`);

    // Run PyInstaller
    const pyinstallerBin = process.platform === 'win32'
      ? path.join(backendDir, 'venv', 'Scripts', 'pyinstaller.exe')
      : path.join(backendDir, 'venv', 'bin', 'pyinstaller');

    if (!fs.existsSync(pyinstallerBin)) {
      throw new Error(`PyInstaller executable not found at: ${pyinstallerBin}`);
    }

    // We run it inside the backendDir so that local module imports resolve naturally
    const pyinstallerCmd = [
      `"${pyinstallerBin}"`,
      '--onefile',
      '--noconsole',
      '--name', 'backend',
      '--hidden-import', 'aiosqlite',
      '--hidden-import', 'email_validator',
      '--hidden-import', 'uvicorn',
      '--distpath', `"${path.join(rootDir, 'electron', 'bin')}"`,
      '--workpath', `"${path.join(rootDir, 'build', 'pyinstaller')}"`,
      '--specpath', `"${path.join(rootDir, 'build', 'pyinstaller')}"`,
      'run_server.py'
    ].join(' ');

    runCommand(pyinstallerCmd, backendDir);

    // Verify backend executable was created
    const exeName = process.platform === 'win32' ? 'backend.exe' : 'backend';
    const builtExePath = path.join(electronBinDir, exeName);
    if (!fs.existsSync(builtExePath)) {
      throw new Error(`Failed to find compiled backend executable at: ${builtExePath}`);
    }
    console.log(`Backend binary compiled successfully: ${builtExePath}`);

    // 4. Run electron-builder to package the desktop app
    console.log('\n--- Step 4: Packaging Electron application ---');
    const builderCmd = 'npx electron-builder';
    runCommand(builderCmd);

    console.log('\n🎉 Standalone build completed successfully!');
    console.log(`Output directory: ${path.join(rootDir, 'dist')}`);

  } catch (error) {
    console.error('\n❌ Standalone build failed:', error);
    process.exit(1);
  }
}

build();
