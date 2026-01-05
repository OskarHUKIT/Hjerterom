@echo off
echo ========================================
echo GitHub Setup for Boligbanken
echo ========================================
echo.

REM Check if Git is installed
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed!
    echo.
    echo Please install Git first:
    echo 1. Visit: https://git-scm.com/download/win
    echo 2. Download and install Git
    echo 3. Restart this script after installation
    echo.
    pause
    exit /b 1
)

echo [OK] Git is installed
git --version
echo.

REM Check if repository is initialized
if not exist ".git" (
    echo Initializing Git repository...
    call git init
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to initialize Git repository
        pause
        exit /b 1
    )
    echo [OK] Git repository initialized
) else (
    echo [OK] Git repository already initialized
)
echo.

REM Check if files are staged/committed
call git status --porcelain >nul 2>&1
if %errorlevel% equ 0 (
    call git status --short | findstr /R "." >nul
    if %errorlevel% equ 0 (
        echo Uncommitted changes detected.
        echo.
        set /p add_files="Do you want to add all files? (Y/N): "
        if /i "%add_files%"=="Y" (
            call git add .
            echo [OK] Files added to staging
            echo.
            set /p commit_msg="Enter commit message (or press Enter for default): "
            if "%commit_msg%"=="" set commit_msg=Initial commit: Boligbanken application
            call git commit -m "%commit_msg%"
            if %errorlevel% equ 0 (
                echo [OK] Files committed
            ) else (
                echo [ERROR] Failed to commit files
            )
        )
    )
)
echo.

REM Check for existing commits
call git log --oneline -1 >nul 2>&1
if %errorlevel% neq 0 (
    echo No commits found. Making initial commit...
    call git add .
    call git commit -m "Initial commit: Boligbanken application"
    if %errorlevel% equ 0 (
        echo [OK] Initial commit created
    )
)
echo.

REM Check remote configuration
call git remote -v >nul 2>&1
if %errorlevel% equ 0 (
    call git remote | findstr /R "." >nul
    if %errorlevel% equ 0 (
        echo Current remote configuration:
        call git remote -v
        echo.
        set /p add_remote="Do you want to add/update remote? (Y/N): "
        if /i not "%add_remote%"=="Y" (
            echo Setup complete! Use 'git push -u origin main' to push to GitHub.
            pause
            exit /b 0
        )
    )
)

echo.
echo ========================================
echo GitHub Remote Configuration
echo ========================================
echo.
echo To connect to GitHub, you need:
echo 1. A GitHub account (create at https://github.com)
echo 2. A repository created on GitHub
echo.
set /p github_username="Enter your GitHub username: "
set /p repo_name="Enter repository name (default: boligbanken): "
if "%repo_name%"=="" set repo_name=boligbanken

echo.
set /p use_ssh="Use SSH? (Y/N, default: N): "
if /i "%use_ssh%"=="Y" (
    set remote_url=git@github.com:%github_username%/%repo_name%.git
) else (
    set remote_url=https://github.com/%github_username%/%repo_name%.git
)

echo.
echo Adding remote: %remote_url%
call git remote remove origin >nul 2>&1
call git remote add origin %remote_url%
if %errorlevel% equ 0 (
    echo [OK] Remote added successfully
) else (
    echo [ERROR] Failed to add remote
    pause
    exit /b 1
)

echo.
echo Verifying remote...
call git remote -v
echo.

REM Rename branch to main if needed
call git branch --show-current >nul 2>&1
for /f "tokens=*" %%i in ('git branch --show-current 2^>nul') do set current_branch=%%i
if "%current_branch%"=="" set current_branch=main
if not "%current_branch%"=="main" (
    echo Renaming branch to 'main'...
    call git branch -M main
)

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Make sure the repository '%repo_name%' exists on GitHub
echo 2. Run: git push -u origin main
echo.
echo If you get authentication errors:
echo - For HTTPS: Use a Personal Access Token as password
echo - For SSH: Make sure your SSH key is added to GitHub
echo.
pause


