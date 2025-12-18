# GitHub Setup Guide

This guide will help you connect your Boligbanken project to GitHub.

## Step 1: Install Git

If Git is not installed on your system:

1. **Download Git for Windows**
   - Visit: https://git-scm.com/download/win
   - Download and run the installer
   - Use default settings during installation

2. **Verify Installation**
   - Open a new PowerShell/Command Prompt window
   - Run: `git --version`
   - You should see the Git version number

## Step 2: Configure Git (First Time Only)

Set up your Git identity:

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Step 3: Initialize Git Repository

If the repository is not already initialized:

```bash
# Navigate to your project directory
cd C:\Users\oskar\Desktop\Cursor.test

# Initialize Git repository
git init

# Add all files to staging
git add .

# Make your first commit
git commit -m "Initial commit: Boligbanken application"
```

## Step 4: Create GitHub Repository

1. **Go to GitHub**
   - Visit: https://github.com
   - Sign in or create an account

2. **Create New Repository**
   - Click the "+" icon in the top right
   - Select "New repository"
   - Repository name: `boligbanken` (or your preferred name)
   - Description: "Boligbanken (Housing Bank) management system"
   - Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
   - Click "Create repository"

## Step 5: Connect Local Repository to GitHub

After creating the repository on GitHub, you'll see instructions. Use these commands:

```bash
# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/boligbanken.git

# Rename main branch to main (if needed)
git branch -M main

# Push your code to GitHub
git push -u origin main
```

## Step 6: Verify Connection

Check that everything is connected:

```bash
# Check remote configuration
git remote -v

# Check status
git status
```

## Alternative: Using SSH (Recommended for Advanced Users)

If you prefer SSH authentication:

1. **Generate SSH Key** (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your.email@example.com"
   ```

2. **Add SSH Key to GitHub**:
   - Copy your public key: `cat ~/.ssh/id_ed25519.pub`
   - Go to GitHub Settings → SSH and GPG keys → New SSH key
   - Paste your key and save

3. **Use SSH URL**:
   ```bash
   git remote add origin git@github.com:YOUR_USERNAME/boligbanken.git
   ```

## Common Commands

### Daily Workflow

```bash
# Check status
git status

# Add changes
git add .
# Or add specific files
git add filename.txt

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push

# Pull latest changes
git pull
```

### Branching

```bash
# Create new branch
git checkout -b feature-name

# Switch branches
git checkout branch-name

# Merge branch
git checkout main
git merge feature-name
```

## Troubleshooting

### Authentication Issues

If you get authentication errors:

1. **Use Personal Access Token** (for HTTPS):
   - GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` permissions
   - Use token as password when pushing

2. **Or use GitHub CLI**:
   ```bash
   # Install GitHub CLI
   winget install GitHub.cli
   
   # Authenticate
   gh auth login
   ```

### Port Already in Use

If you get connection errors, check your firewall settings.

### Large Files

If you have large files, consider using Git LFS:
```bash
git lfs install
git lfs track "*.pdf"
git add .gitattributes
```

## Next Steps

After connecting to GitHub:

1. Set up branch protection rules (Settings → Branches)
2. Add collaborators if working in a team
3. Set up GitHub Actions for CI/CD (optional)
4. Create issues for tracking tasks
5. Set up a project board for project management

