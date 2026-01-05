# GitHub Authentication Guide

This guide will help you authenticate with GitHub so you can push your code.

## Quick Solution: Use GitHub CLI (Easiest)

The easiest way to authenticate is using GitHub CLI:

```powershell
# Install GitHub CLI (if not already installed)
winget install GitHub.cli

# Authenticate with GitHub
gh auth login
```

Follow the prompts:
1. Choose "GitHub.com"
2. Choose "HTTPS" or "SSH" (HTTPS is easier)
3. Authenticate via web browser
4. Done!

After authentication, you can push:
```powershell
git push -u origin main
```

---

## Method 1: Personal Access Token (PAT) for HTTPS

If you're using HTTPS URLs (like `https://github.com/OskarHUKIT/Boly.git`), you need a Personal Access Token.

### Step 1: Create a Personal Access Token

1. **Go to GitHub Settings**
   - Visit: https://github.com/settings/tokens
   - Or: GitHub → Your Profile → Settings → Developer settings → Personal access tokens → Tokens (classic)

2. **Generate New Token**
   - Click "Generate new token" → "Generate new token (classic)"
   - Give it a name: `Boligbanken Project`
   - Set expiration (90 days, 1 year, or no expiration)
   - Select scopes:
     - ✅ **repo** (Full control of private repositories) - **REQUIRED**
     - ✅ **workflow** (if using GitHub Actions)
   - Click "Generate token"

3. **Copy the Token**
   - ⚠️ **IMPORTANT**: Copy the token immediately! You won't be able to see it again.
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### Step 2: Use the Token

When you push, Git will ask for credentials:
- **Username**: Your GitHub username (`OskarHUKIT`)
- **Password**: Paste your Personal Access Token (NOT your GitHub password)

```powershell
git push -u origin main
```

### Step 3: Store Credentials (Optional but Recommended)

To avoid entering the token every time:

**Option A: Git Credential Manager (Windows)**
```powershell
# Git Credential Manager should be installed with Git
# It will prompt you to save credentials
git push -u origin main
# Enter username and token when prompted
# Credentials will be saved automatically
```

**Option B: Store in Git Config (Less Secure)**
```powershell
# Store credentials (not recommended for shared computers)
git config --global credential.helper wincred
```

**Option C: Use Token in URL (Not Recommended)**
```powershell
# Update remote URL with token (token will be visible in config)
git remote set-url origin https://YOUR_TOKEN@github.com/OskarHUKIT/Boly.git
```

---

## Method 2: SSH Keys (More Secure)

SSH keys provide a more secure way to authenticate without entering passwords.

### Step 1: Generate SSH Key

```powershell
# Generate a new SSH key
ssh-keygen -t ed25519 -C "your.email@example.com"

# Press Enter to accept default location (C:\Users\oskar\.ssh\id_ed25519)
# Enter a passphrase (optional but recommended) or press Enter for no passphrase
```

### Step 2: Add SSH Key to GitHub

1. **Copy your public key**
   ```powershell
   # Display your public key
   cat ~/.ssh/id_ed25519.pub
   # Or on Windows:
   type $env:USERPROFILE\.ssh\id_ed25519.pub
   ```

2. **Add to GitHub**
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Title: `My Windows PC` (or any name)
   - Key: Paste your public key
   - Click "Add SSH key"

### Step 3: Update Remote URL to Use SSH

```powershell
# Change remote from HTTPS to SSH
git remote set-url origin git@github.com:OskarHUKIT/Boly.git

# Test SSH connection
ssh -T git@github.com
# You should see: "Hi OskarHUKIT! You've successfully authenticated..."

# Now push
git push -u origin main
```

---

## Method 3: GitHub CLI (Recommended)

GitHub CLI handles authentication automatically and is the easiest method.

### Install GitHub CLI

```powershell
winget install GitHub.cli
```

### Authenticate

```powershell
gh auth login
```

Follow the prompts:
- **What account do you want to log into?** → GitHub.com
- **What is your preferred protocol?** → HTTPS (or SSH)
- **How would you like to authenticate?** → Login with a web browser
- A browser window will open → Authorize GitHub CLI
- Done!

### Push Your Code

```powershell
git push -u origin main
```

No need to enter credentials - GitHub CLI handles it!

---

## Troubleshooting

### "Authentication failed" or "Permission denied"

1. **Check your remote URL**
   ```powershell
   git remote -v
   ```
   - HTTPS: `https://github.com/OskarHUKIT/Boly.git`
   - SSH: `git@github.com:OskarHUKIT/Boly.git`

2. **For HTTPS**: Make sure you're using a Personal Access Token, not your password

3. **For SSH**: Make sure your SSH key is added to GitHub and SSH agent is running
   ```powershell
   # Start SSH agent
   Start-Service ssh-agent
   
   # Add your key
   ssh-add ~/.ssh/id_ed25519
   ```

### "Repository not found"

- Make sure the repository exists on GitHub
- Check that you have access to the repository
- Verify the repository name and username are correct

### "Support for password authentication was removed"

GitHub no longer accepts passwords for HTTPS. You must use:
- Personal Access Token (PAT)
- SSH keys
- GitHub CLI

---

## Quick Reference

### Check Current Authentication

```powershell
# Check remote URL
git remote -v

# Check GitHub CLI authentication
gh auth status

# Test SSH connection
ssh -T git@github.com
```

### Change Authentication Method

```powershell
# Switch to HTTPS
git remote set-url origin https://github.com/OskarHUKIT/Boly.git

# Switch to SSH
git remote set-url origin git@github.com:OskarHUKIT/Boly.git
```

---

## Recommended: Use GitHub CLI

For the easiest experience, use GitHub CLI:

```powershell
winget install GitHub.cli
gh auth login
git push -u origin main
```

That's it! No tokens, no passwords, no SSH keys to manage.


