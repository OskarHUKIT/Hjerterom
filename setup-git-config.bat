@echo off
echo ========================================
echo Git Configuration Setup
echo ========================================
echo.
echo Git needs to know who you are for commits.
echo.
set /p git_name="Enter your name (e.g., John Doe): "
set /p git_email="Enter your email (e.g., john@example.com): "

echo.
echo Configuring Git...
git config --global user.name "%git_name%"
git config --global user.email "%git_email%"

echo.
echo [OK] Git configured successfully!
echo.
echo Your Git configuration:
git config --global user.name
git config --global user.email
echo.
pause



