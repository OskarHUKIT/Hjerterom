# Initial setup script for mobile app development
# Run this once to set up Capacitor and add iOS/Android platforms

Write-Host "Setting up Boligbanken for mobile app development..." -ForegroundColor Green

# Navigate to frontend directory
Set-Location frontend

# Install dependencies
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install

# Initialize Capacitor (if not already initialized)
if (-not (Test-Path "capacitor.config.ts")) {
    Write-Host "Capacitor config already exists, skipping init..." -ForegroundColor Yellow
} else {
    Write-Host "Capacitor config found, proceeding..." -ForegroundColor Green
}

# Add iOS platform (if not already added)
if (-not (Test-Path "ios")) {
    Write-Host "Adding iOS platform..." -ForegroundColor Yellow
    npx cap add ios
} else {
    Write-Host "iOS platform already exists, skipping..." -ForegroundColor Yellow
}

# Add Android platform (if not already added)
if (-not (Test-Path "android")) {
    Write-Host "Adding Android platform..." -ForegroundColor Yellow
    npx cap add android
} else {
    Write-Host "Android platform already exists, skipping..." -ForegroundColor Yellow
}

# Build and sync
Write-Host "Building and syncing..." -ForegroundColor Yellow
npm run build:mobile
npm run cap:sync

Write-Host "`nSetup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "  1. Build mobile app: .\build-mobile.ps1" -ForegroundColor White
Write-Host "  2. Open iOS: cd frontend && npm run cap:open:ios" -ForegroundColor White
Write-Host "  3. Open Android: cd frontend && npm run cap:open:android" -ForegroundColor White

# Return to root directory
Set-Location ..
