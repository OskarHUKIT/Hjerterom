# Build script for mobile app (iOS/Android)
# This script builds the Next.js app for mobile and syncs with Capacitor

Write-Host "Building Boligbanken mobile app..." -ForegroundColor Green

# Navigate to frontend directory
Set-Location frontend

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Build Next.js app for mobile (static export)
Write-Host "Building Next.js app for mobile..." -ForegroundColor Yellow
npm run build:mobile

# Sync with Capacitor
Write-Host "Syncing with Capacitor..." -ForegroundColor Yellow
npm run cap:sync

Write-Host "`nMobile build complete!" -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  - For iOS: npm run cap:open:ios" -ForegroundColor White
Write-Host "  - For Android: npm run cap:open:android" -ForegroundColor White

# Return to root directory
Set-Location ..
