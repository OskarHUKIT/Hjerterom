@echo off
echo Starting Boligbanken servers...
echo.
echo Starting backend on port 3001...
start "Boligbanken Backend" cmd /k "cd backend && npm.cmd run dev"
timeout /t 3 /nobreak >nul
echo.
echo Starting frontend on port 3000...
start "Boligbanken Frontend" cmd /k "cd frontend && npm.cmd run dev"
echo.
echo Both servers are starting in separate windows.
echo.
echo Frontend will be available at: http://localhost:3000
echo Backend API will be available at: http://localhost:3001
echo.
pause






