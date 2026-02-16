@echo off
echo ========================================
echo Connecting to GitHub Repository
echo ========================================
echo.

REM Refresh PATH to include Git
set "PATH=%PATH%;C:\Program Files\Git\cmd;C:\Program Files\Git\bin"

REM Check if Git is available
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not found in PATH.
    echo Please restart your terminal/PowerShell window after Git installation.
    echo.
    echo Alternatively, Git is usually installed at:
    echo C:\Program Files\Git\cmd\git.exe
    echo.
    pause
    exit /b 1
)

echo [OK] Git found
git --version
echo.

REM Check if Git is configured
git config user.name >nul 2>&1
if %errorlevel% neq 0 (
    echo Git user configuration not set.
    echo.
    set /p git_name="Enter your name: "
    set /p git_email="Enter your email: "
    git config --global user.name "%git_name%"
    git config --global user.email "%git_email%"
    echo [OK] Git configured
    echo.
)

REM Check if repository is initialized
if not exist ".git" (
    echo Initializing Git repository...
    call git init
    echo.
)

REM Check if there are uncommitted changes
call git status --porcelain | findstr /R "." >nul
if %errorlevel% equ 0 (
    echo Adding files to Git...
    call git add .
    echo.
    call git status --short | findstr /R "." >nul
    if %errorlevel% equ 0 (
        echo Creating initial commit...
        call git commit -m "Initial commit: Boligbanken application"
        echo.
    )
)

REM Check if remote already exists
call git remote get-url origin >nul 2>&1
if %errorlevel% equ 0 (
    echo Current remote origin:
    call git remote get-url origin
    echo.
    set /p update_remote="Remote already exists. Update it? (Y/N): "
    if /i not "%update_remote%"=="Y" (
        echo Keeping existing remote.
        goto :push
    )
    call git remote remove origin
)

REM Add GitHub remote
echo Adding GitHub remote: https://github.com/OskarHUKIT/Boly.git
call git remote add origin https://github.com/OskarHUKIT/Boly.git
if %errorlevel% equ 0 (
    echo [OK] Remote added successfully
) else (
    echo [ERROR] Failed to add remote
    pause
    exit /b 1
)

REM Rename branch to main if needed
call git branch --show-current >nul 2>&1
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set current_branch=%%i
if "%current_branch%"=="" (
    call git checkout -b main >nul 2>&1
    set current_branch=main
)
if not "%current_branch%"=="main" (
    echo Renaming branch to 'main'...
    call git branch -M main
)

:push
echo.
echo ========================================
echo Ready to push to GitHub
echo ========================================
echo.
echo Repository: https://github.com/OskarHUKIT/Boly.git
echo.
set /p push_now="Push to GitHub now? (Y/N): "
if /i "%push_now%"=="Y" (
    echo.
    echo Pushing to GitHub...
    call git push -u origin main
    if %errorlevel% equ 0 (
        echo.
        echo [SUCCESS] Code pushed to GitHub!
        echo.
        echo Your repository is available at:
        echo https://github.com/OskarHUKIT/Boly
    ) else (
        echo.
        echo [ERROR] Push failed. You may need to:
        echo 1. Authenticate with GitHub (use Personal Access Token)
        echo 2. Or set up SSH keys
        echo.
        echo See GITHUB_SETUP.md for detailed instructions.
    )
) else (
    echo.
    echo To push later, run:
    echo git push -u origin main
)

echo.
pause



