@echo off
echo Installing Boligbanken dependencies...
echo.
echo This may take a few minutes...
echo.

echo Installing frontend dependencies...
cd frontend
call npm.cmd install
if %errorlevel% neq 0 (
    echo Frontend installation failed!
    pause
    exit /b 1
)
cd ..

echo.
echo Installing backend dependencies...
cd backend
call npm.cmd install
if %errorlevel% neq 0 (
    echo Backend installation failed!
    pause
    exit /b 1
)
cd ..

echo.
echo ✅ All dependencies installed successfully!
echo.
pause







