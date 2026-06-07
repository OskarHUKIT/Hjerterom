# Workflow script for updating your published mobile app
# Use this script whenever you want to release a new version

param(
    [Parameter(Mandatory=$false)]
    [string]$Platform = "both",  # "ios", "android", or "both"
    
    [Parameter(Mandatory=$false)]
    [string]$Version = "",  # e.g., "1.0.1"
    
    [Parameter(Mandatory=$false)]
    [string]$BuildNumber = ""  # e.g., "2"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Boligbanken Mobile App Update Workflow" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend directory
Set-Location frontend

# Step 1: Build Next.js app for mobile
Write-Host "[1/5] Building Next.js app for mobile..." -ForegroundColor Yellow
npm run build:mobile

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Please fix errors and try again." -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Step 2: Sync with Capacitor
Write-Host "[2/5] Syncing with Capacitor..." -ForegroundColor Yellow
npm run cap:sync

if ($LASTEXITCODE -ne 0) {
    Write-Host "Capacitor sync failed!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

# Step 3: Update version numbers (if provided)
if ($Version -ne "" -or $BuildNumber -ne "") {
    Write-Host "[3/5] Updating version numbers..." -ForegroundColor Yellow
    
    # Update Android version
    if (Test-Path "android/app/build.gradle") {
        $buildGradle = Get-Content "android/app/build.gradle" -Raw
        
        if ($Version -ne "") {
            $buildGradle = $buildGradle -replace 'versionName\s+"[^"]+"', "versionName `"$Version`""
            Write-Host "  Android versionName set to: $Version" -ForegroundColor Green
        }
        
        if ($BuildNumber -ne "") {
            $buildGradle = $buildGradle -replace 'versionCode\s+\d+', "versionCode $BuildNumber"
            Write-Host "  Android versionCode set to: $BuildNumber" -ForegroundColor Green
        }
        
        Set-Content "android/app/build.gradle" $buildGradle
    }
    
    Write-Host "  iOS: Update version in Xcode (General → Version & Build)" -ForegroundColor Yellow
}

# Step 4: Build platform-specific packages
Write-Host "[4/5] Building platform packages..." -ForegroundColor Yellow

if ($Platform -eq "android" -or $Platform -eq "both") {
    Write-Host "  Building Android App Bundle..." -ForegroundColor Cyan
    Set-Location android
    .\gradlew bundleRelease
    
    if ($LASTEXITCODE -eq 0) {
        $aabPath = "app\build\outputs\bundle\release\app-release.aab"
        if (Test-Path $aabPath) {
            Write-Host "  ✓ Android AAB created: $aabPath" -ForegroundColor Green
        }
    } else {
        Write-Host "  ✗ Android build failed!" -ForegroundColor Red
    }
    Set-Location ..
}

if ($Platform -eq "ios" -or $Platform -eq "both") {
    Write-Host "  Opening iOS project in Xcode..." -ForegroundColor Cyan
    Write-Host "  → Build and Archive in Xcode, then upload to App Store Connect" -ForegroundColor Yellow
    npm run cap:open:ios
}

# Step 5: Summary
Write-Host ""
Write-Host "[5/5] Summary" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next steps:" -ForegroundColor Green

if ($Platform -eq "android" -or $Platform -eq "both") {
    Write-Host ""
    Write-Host "Android:" -ForegroundColor Cyan
    Write-Host "  1. Go to Google Play Console" -ForegroundColor White
    Write-Host "  2. Select your app → Production → Create new release" -ForegroundColor White
    Write-Host "  3. Upload: frontend\android\app\build\outputs\bundle\release\app-release.aab" -ForegroundColor White
    Write-Host "  4. Add release notes" -ForegroundColor White
    Write-Host "  5. Review and rollout" -ForegroundColor White
}

if ($Platform -eq "ios" -or $Platform -eq "both") {
    Write-Host ""
    Write-Host "iOS:" -ForegroundColor Cyan
    Write-Host "  1. In Xcode: Product → Archive" -ForegroundColor White
    Write-Host "  2. Distribute App → App Store Connect → Upload" -ForegroundColor White
    Write-Host "  3. Go to App Store Connect → Your App → Version" -ForegroundColor White
    Write-Host "  4. Update 'What's New' and submit for review" -ForegroundColor White
}

Write-Host ""
Write-Host "Done! Your app is ready to upload." -ForegroundColor Green

# Return to root directory
Set-Location ..
