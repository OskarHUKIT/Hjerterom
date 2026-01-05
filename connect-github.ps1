# Refresh PATH to include Git
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Connecting to GitHub Repository" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Git is available
try {
    $gitVersion = git --version
    Write-Host "[OK] Git found: $gitVersion" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "[ERROR] Git is not found. Please restart your terminal after Git installation." -ForegroundColor Red
    Write-Host ""
    pause
    exit 1
}

# Check if Git is configured
$gitName = git config --global user.name 2>$null
$gitEmail = git config --global user.email 2>$null

if (-not $gitName -or -not $gitEmail) {
    Write-Host "Git user configuration not set." -ForegroundColor Yellow
    Write-Host ""
    $gitName = Read-Host "Enter your name"
    $gitEmail = Read-Host "Enter your email"
    git config --global user.name $gitName
    git config --global user.email $gitEmail
    Write-Host "[OK] Git configured" -ForegroundColor Green
    Write-Host ""
}

# Check if repository is initialized
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host ""
}

# Check if there are uncommitted changes
$status = git status --porcelain
if ($status) {
    Write-Host "Adding files to Git..." -ForegroundColor Yellow
    git add .
    Write-Host ""
    
    $statusAfterAdd = git status --porcelain
    if ($statusAfterAdd) {
        Write-Host "Creating initial commit..." -ForegroundColor Yellow
        git commit -m "Initial commit: Boligbanken application"
        Write-Host ""
    }
}

# Check if remote already exists
try {
    $currentRemote = git remote get-url origin 2>$null
    if ($currentRemote) {
        Write-Host "Current remote origin: $currentRemote" -ForegroundColor Yellow
        Write-Host ""
        $update = Read-Host "Remote already exists. Update it? (Y/N)"
        if ($update -ne "Y" -and $update -ne "y") {
            Write-Host "Keeping existing remote." -ForegroundColor Yellow
        } else {
            git remote remove origin
        }
    }
} catch {
    # Remote doesn't exist, which is fine
}

# Add GitHub remote if it doesn't exist
try {
    $remoteCheck = git remote get-url origin 2>$null
    if (-not $remoteCheck) {
        Write-Host "Adding GitHub remote: https://github.com/OskarHUKIT/Boly.git" -ForegroundColor Yellow
        git remote add origin https://github.com/OskarHUKIT/Boly.git
        Write-Host "[OK] Remote added successfully" -ForegroundColor Green
        Write-Host ""
    }
} catch {
    Write-Host "[ERROR] Failed to add remote" -ForegroundColor Red
    pause
    exit 1
}

# Rename branch to main if needed
$currentBranch = git branch --show-current 2>$null
if (-not $currentBranch) {
    git checkout -b main 2>$null
    $currentBranch = "main"
}
if ($currentBranch -ne "main") {
    Write-Host "Renaming branch to 'main'..." -ForegroundColor Yellow
    git branch -M main
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Ready to push to GitHub" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repository: https://github.com/OskarHUKIT/Boly.git" -ForegroundColor Cyan
Write-Host ""
$pushNow = Read-Host "Push to GitHub now? (Y/N)"

if ($pushNow -eq "Y" -or $pushNow -eq "y") {
    Write-Host ""
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[SUCCESS] Code pushed to GitHub!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your repository is available at:" -ForegroundColor Cyan
        Write-Host "https://github.com/OskarHUKIT/Boly" -ForegroundColor Cyan
    } else {
        Write-Host ""
        Write-Host "[ERROR] Push failed. You may need to:" -ForegroundColor Red
        Write-Host "1. Authenticate with GitHub (use Personal Access Token)" -ForegroundColor Yellow
        Write-Host "2. Or set up SSH keys" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "See GITHUB_SETUP.md for detailed instructions." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "To push later, run:" -ForegroundColor Cyan
    Write-Host "git push -u origin main" -ForegroundColor White
}

Write-Host ""
pause


