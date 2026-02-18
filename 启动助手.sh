#!/bin/bash
# SQE Data Analysis Assistant - macOS Launcher
# Translated from 启动助手.bat

cd "$(dirname "$0")"

echo "========================================"
echo "   SQE Data Analysis Assistant"
echo "========================================"
echo

# Check if port 8888 is in use
PORT_PID=$(lsof -ti:8888 2>/dev/null)

if [ -n "$PORT_PID" ]; then
    echo "[!] Port 8888 is in use by process ID: $PORT_PID"
    
    # Check if it's our SQE server
    PROCESS_CMD=$(ps -p $PORT_PID -o command= 2>/dev/null)
    
    if echo "$PROCESS_CMD" | grep -qi "server/index.js"; then
        echo "[+] Found SQE server process $PORT_PID"
        echo "[+] Stopping SQE server..."
        kill $PORT_PID 2>/dev/null
        sleep 2
        echo "[OK] SQE process stopped"
    else
        echo "[!] Process $PORT_PID is not SQE-related: $PROCESS_CMD"
        echo "[!] SQE server may fail to start if port remains in use"
    fi
else
    echo "[OK] Port 8888 is available"
fi

echo

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "[x] ERROR: Node.js not found!"
    echo
    echo "Please install Node.js:"
    echo "  brew install node"
    echo "  or visit: https://nodejs.org/"
    exit 1
fi

echo "[OK] Node.js found: $(node --version)"
echo

# Check and install dependencies
if [ ! -d "node_modules" ]; then
    echo "[+] First run, installing dependencies..."
    echo "This may take a few minutes, please wait..."
    echo
    
    npm install
    
    if [ $? -ne 0 ]; then
        echo
        echo "[x] Failed to install dependencies!"
        exit 1
    fi
    
    echo
    echo "[OK] Dependencies installed successfully!"
    echo
fi

echo "========================================"
echo "[OK] Starting server..."
echo
echo "Server URL: http://localhost:8888"
echo
echo "Tip: Press Ctrl+C to stop the server"
echo "========================================"
echo

# Start server
node server/index.js

echo
echo "========================================"
echo "Server stopped"
echo "========================================"
