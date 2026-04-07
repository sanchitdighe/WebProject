@echo off
echo ========================================================
echo    SHARING YOUR WEBSITE (DEBUG MODE)
echo ========================================================
echo.

:: Check if the server is even running on port 3000 first
netstat -ano | findstr :3000 | findstr LISTENING > nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Your website is NOT running on port 3000!
    echo         Please run 'start-website.bat' first.
    echo.
    pause
    exit /b
)

echo [OK] Website is running locally.
echo [1/2] Connecting to tunnel...
echo.

:: Run the tunnel and keep the window open to catch any errors
ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 pinggy.io || (
    echo.
    echo [!] SSH method failed. Trying backup method (localtunnel)...
    echo.
    call npx localtunnel --port 3000
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [FATAL ERROR] All sharing methods failed. 
    echo Check your internet connection or firewall.
)

echo.
echo Please do not close this window while sharing.
pause
