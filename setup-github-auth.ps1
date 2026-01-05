# GitHub Authentication Setup Script
# This script helps you set up authentication for GitHub

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GitHub Authentication Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Check if Git is available
try {
    $null = git --version 2>$null
    Write-Host "[OK] Git is installed" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Git first: winget install Git.Git" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host ""
Write-Host "Choose authentication method:" -ForegroundColor Yellow
Write-Host "1. GitHub CLI (Easiest - Recommended)" -ForegroundColor White
Write-Host "2. Personal Access Token (PAT)" -ForegroundColor White
Write-Host "3. SSH Keys" -ForegroundColor White
Write-Host "4. Just show instructions" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Setting up GitHub CLI..." -ForegroundColor Cyan
        
        # Check if GitHub CLI is installed
        try {
            $null = gh --version 2>$null
            Write-Host "[OK] GitHub CLI is already installed" -ForegroundColor Green
        } catch {
            Write-Host "Installing GitHub CLI..." -ForegroundColor Yellow
            winget install --id GitHub.cli -e --source winget
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[ERROR] Failed to install GitHub CLI" -ForegroundColor Red
                pause
                exit 1
            }
            Write-Host "[OK] GitHub CLI installed" -ForegroundColor Green
            Write-Host ""
            Write-Host "Please restart your terminal and run this script again." -ForegroundColor Yellow
            pause
            exit 0
        }
        
        Write-Host ""
        Write-Host "Starting GitHub authentication..." -ForegroundColor Yellow
        Write-Host "A browser window will open for authentication." -ForegroundColor Cyan
        Write-Host ""
        
        gh auth login
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[SUCCESS] GitHub authentication complete!" -ForegroundColor Green
            Write-Host ""
            Write-Host "You can now push to GitHub:" -ForegroundColor Cyan
            Write-Host "git push -u origin main" -ForegroundColor White
        } else {
            Write-Host ""
            Write-Host "[ERROR] Authentication failed" -ForegroundColor Red
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Personal Access Token Setup" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Follow these steps:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Go to: https://github.com/settings/tokens" -ForegroundColor White
        Write-Host "2. Click 'Generate new token' → 'Generate new token (classic)'" -ForegroundColor White
        Write-Host "3. Name it: 'Boligbanken Project'" -ForegroundColor White
        Write-Host "4. Select scope: ✅ repo (Full control)" -ForegroundColor White
        Write-Host "5. Click 'Generate token'" -ForegroundColor White
        Write-Host "6. COPY THE TOKEN (you won't see it again!)" -ForegroundColor Red
        Write-Host ""
        
        $token = Read-Host "Paste your Personal Access Token here"
        
        if ($token) {
            Write-Host ""
            Write-Host "Configuring Git Credential Manager..." -ForegroundColor Yellow
            
            # Configure credential helper
            git config --global credential.helper manager-core
            
            Write-Host ""
            Write-Host "[OK] Configuration complete!" -ForegroundColor Green
            Write-Host ""
            Write-Host "When you push, use:" -ForegroundColor Cyan
            Write-Host "  Username: OskarHUKIT" -ForegroundColor White
            Write-Host "  Password: $token" -ForegroundColor White
            Write-Host ""
            Write-Host "Or run: git push -u origin main" -ForegroundColor Cyan
            Write-Host "Git Credential Manager will save your credentials." -ForegroundColor Yellow
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "SSH Key Setup" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        
        # Check if SSH key exists
        $sshKeyPath = "$env:USERPROFILE\.ssh\id_ed25519"
        $sshKeyPubPath = "$env:USERPROFILE\.ssh\id_ed25519.pub"
        
        if (Test-Path $sshKeyPubPath) {
            Write-Host "[OK] SSH key found" -ForegroundColor Green
            Write-Host ""
            Write-Host "Your public key:" -ForegroundColor Cyan
            Get-Content $sshKeyPubPath
            Write-Host ""
            Write-Host "Copy the key above and add it to GitHub:" -ForegroundColor Yellow
            Write-Host "https://github.com/settings/keys" -ForegroundColor White
        } else {
            Write-Host "Generating SSH key..." -ForegroundColor Yellow
            Write-Host ""
            
            $email = Read-Host "Enter your email address"
            
            ssh-keygen -t ed25519 -C $email -f $sshKeyPath -N '""'
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "[OK] SSH key generated!" -ForegroundColor Green
                Write-Host ""
                Write-Host "Your public key:" -ForegroundColor Cyan
                Get-Content $sshKeyPubPath
                Write-Host ""
                Write-Host "Next steps:" -ForegroundColor Yellow
                Write-Host "1. Copy the key above" -ForegroundColor White
                Write-Host "2. Go to: https://github.com/settings/keys" -ForegroundColor White
                Write-Host "3. Click 'New SSH key'" -ForegroundColor White
                Write-Host "4. Paste the key and save" -ForegroundColor White
                Write-Host ""
                
                # Start SSH agent and add key
                Write-Host "Adding key to SSH agent..." -ForegroundColor Yellow
                Start-Service ssh-agent -ErrorAction SilentlyContinue
                ssh-add $sshKeyPath
                
                Write-Host ""
                Write-Host "After adding the key to GitHub, update your remote:" -ForegroundColor Cyan
                Write-Host "git remote set-url origin git@github.com:OskarHUKIT/Boly.git" -ForegroundColor White
            }
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "Opening authentication guide..." -ForegroundColor Cyan
        Write-Host ""
        Write-Host "See GITHUB_AUTH.md for detailed instructions" -ForegroundColor Yellow
        Write-Host ""
        
        # Try to open the file
        if (Test-Path "GITHUB_AUTH.md") {
            Start-Process "GITHUB_AUTH.md"
        }
    }
    
    default {
        Write-Host ""
        Write-Host "Invalid choice" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After authentication, push your code:" -ForegroundColor Yellow
Write-Host "git push -u origin main" -ForegroundColor White
Write-Host ""
pause


