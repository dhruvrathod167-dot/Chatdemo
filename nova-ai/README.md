# NOVA AI Client

A standalone desktop application for NOVA AI, built with Electron, FastAPI, and React.

## Features

- 🖥️ **Desktop Application**: Native desktop experience with Electron
- 🤖 **NOVA AI Chat**: Full access to NOVA AI chat functionality
- 🔒 **Authentication**: Secure login and registration
- 💾 **Data Persistence**: Chat history and settings saved locally
- 📁 **File Upload**: Support for document uploads and RAG
- 🎨 **Modern UI**: Clean, responsive interface
- 🚀 **Easy Setup**: No manual dependency installation required

## Architecture

```
NOVA AI Client.exe
├── Electron (Main Process)
├── FastAPI Backend (127.0.0.1:8001)
└── React Frontend (Built with Vite)
```

## Requirements

- Windows 10 or later
- Node.js 16+ (for development only)
- Python 3.8+ (for development only)

## Installation

### For End Users

1. Download `NOVA-AI-Client-Setup.exe`
2. Run the installer
3. Launch NOVA AI Client from the Start Menu or desktop shortcut

### For Portable Use

1. Download `NOVA-AI-Client.exe`
2. Run the executable directly
3. No installation required

## Development

### Prerequisites

- Node.js 16+
- Python 3.8+
- npm (comes with Node.js)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install:all
   ```

### Development Mode

Start the development environment:
```bash
npm run dev
```

This will:
- Start the FastAPI backend (http://localhost:8001)
- Start the React frontend (http://localhost:3000)
- Launch the Electron application

### Building for Production

Create the Windows installer:
```bash
npm run build
```

This will create:
- `NOVA-AI-Client-Setup.exe` (Windows installer)
- `NOVA-AI-Client.exe` (Portable executable)

### Manual Build Steps

If you need to build individual components:

```bash
# Build frontend
npm run build:frontend

# Build frontend for Electron
npm run build:frontend:electron

# Build backend with PyInstaller
npm run build:backend

# Build Electron application
npm run build:electron
```

## Project Structure

```
nova-ai/
├── electron/                 # Electron application
│   ├── main.js              # Electron main process
│   ├── package.json          # Electron package.json
│   ├── build-backend.py      # PyInstaller build script
│   └── backend/             # Backend files (copied during build)
├── frontend/                # React frontend
│   ├── src/                 # Source code
│   ├── public/              # Static assets
│   ├── package.json         # Frontend package.json
│   ├── vite.config.ts       # Vite configuration
│   └── vite.electron.config.ts # Electron-specific Vite config
├── backend/                 # FastAPI backend source
│   ├── app/                 # Application code
│   ├── requirements.txt     # Python dependencies
│   └── nova_ai.db          # SQLite database
├── package.json             # Root package.json
├── build-app.js             # Build script
├── dev-app.js               # Development script
└── README.md               # This file
```

## Configuration

### Environment Variables

The application uses environment variables for configuration:

- `VITE_API_URL`: Backend API URL (default: http://127.0.0.1:8001)
- `VITE_APP_NAME`: Application name (default: NOVA AI Client)
- `VITE_APP_VERSION`: Application version (default: 1.0.0)

### Backend Configuration

The backend uses a `config.py` file with settings for:
- Database connection (SQLite by default)
- AI provider (Ollama or OpenAI)
- JWT secret key
- CORS origins

## Usage

1. Launch NOVA AI Client
2. The application will automatically:
   - Start the FastAPI backend
   - Load the React frontend
   - Open the chat interface
3. Login with existing credentials or create a new account
4. Start chatting with NOVA AI

## Troubleshooting

### Common Issues

**Application won't start:**
- Ensure the backend executable exists in `electron/backend/`
- Check if port 8001 is available
- Run as administrator if permission issues occur

**Chat not working:**
- Check if the backend is running (http://localhost:8001)
- Verify API configuration in environment variables
- Check browser console for errors

**Build errors:**
- Ensure all dependencies are installed
- Check Python and Node.js versions
- Verify PyInstaller is properly installed

### Logs

The application logs are available in:
- Windows Event Viewer (for installed version)
- Application data directory
- Browser developer tools (Ctrl+Shift+I)

## Support

For issues and feature requests:
- Check the troubleshooting section
- Review the logs for error messages
- Ensure your system meets the requirements

## License

This project is licensed under the MIT License.