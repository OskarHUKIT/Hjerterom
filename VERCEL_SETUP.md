# Vercel Continuous Deployment Setup

## ✅ Current Status

Your repository is connected to GitHub and ready for Vercel auto-deployments.

## 🔄 How Auto-Deployment Works

Every time you push to GitHub, Vercel will:
1. Detect the push automatically
2. Build your project from the `frontend` folder
3. Deploy the new version
4. Update your live site (usually takes 2-3 minutes)

## 📋 Vercel Dashboard Checklist

Make sure these settings are correct in your Vercel dashboard:

1. **Root Directory**: Set to `frontend`
   - Go to: Settings → General → Root Directory
   - Value: `frontend`

2. **Framework Preset**: Next.js (auto-detected)

3. **Build Command**: `npm run build` (default)

4. **Output Directory**: `.next` (default)

5. **Install Command**: `npm install` (default)

## 🚀 Testing Auto-Deployment

To test if auto-deployment works:

1. Make a small change (e.g., update a text in `frontend/app/page.tsx`)
2. Commit and push:
   ```powershell
   git add .
   git commit -m "Test deployment"
   git push origin main
   ```
3. Go to Vercel dashboard → Deployments
4. You should see a new deployment start automatically
5. Wait 2-3 minutes for it to complete
6. Check your site - it should show the changes

## 🔍 Troubleshooting

### If deployments don't start automatically:

1. **Check GitHub Integration**
   - Go to Vercel → Settings → Git
   - Verify your GitHub repository is connected
   - Repository should be: `OskarHUKIT/Boly`

2. **Check Branch**
   - Make sure you're pushing to `main` branch
   - Vercel should be set to deploy from `main`

3. **Manual Redeploy**
   - Go to Deployments tab
   - Click "Redeploy" on latest deployment
   - Or push a new commit

### If build fails:

1. Check build logs in Vercel dashboard
2. Common issues:
   - Missing dependencies (check `package.json`)
   - Build errors (check logs)
   - Root directory not set correctly

## 📝 Quick Reference

**Your Vercel URL**: https://boly-pi.vercel.app/

**GitHub Repository**: https://github.com/OskarHUKIT/Boly

**Deployment Status**: Check at https://vercel.com/dashboard

## 💡 Development Workflow

1. Make changes locally
2. Test with: `.\dev-frontend.bat`
3. When happy, commit and push:
   ```powershell
   git add .
   git commit -m "Description of changes"
   git push origin main
   ```
4. Vercel automatically deploys (2-3 minutes)
5. Check your live site!

