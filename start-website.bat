@echo off
echo Starting Trusty Services Servers...

:: Kill any existing processes on ports 8000 and 3000 to prevent 'address already in use' errors
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do taskkill /f /pid %%a 2>nul

:: Wait a moment for ports to clear
timeout /t 1 /nobreak > nul

:: Start the Python backend server (now unified)
start "Trusty Services Server" cmd /k "python server.py"

:: Wait 2 seconds for server to start
timeout /t 2 /nobreak > nul

:: Open the website and admin dashboard
start http://127.0.0.1:3000
start http://127.0.0.1:3000/admin.html
