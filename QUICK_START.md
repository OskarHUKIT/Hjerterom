# Quick Start Guide - Bo.ly Development

## 🚀 Local Development (Easiest Way)

### Option 1: Run Frontend Only (Recommended)
```powershell
.\dev-frontend.bat
```
Then open: http://localhost:3000

**That's it!** The app will auto-reload when you make changes.

### Option 2: Run Both Frontend and Backend
```powershell
.\start-both.bat
```
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 🌐 Vercel Deployment (Automatic)

Every time you push to GitHub, Vercel automatically deploys:

```powershell
git add .
git commit -m "Your changes"
git push origin main
```

**Wait 2-3 minutes**, then check: https://boly-pi.vercel.app/

## 📝 Development Workflow

1. **Make changes** in your code editor
2. **See changes instantly** at http://localhost:3000 (if dev server is running)
3. **When ready**, push to GitHub:
   ```powershell
   git add .
   git commit -m "Description"
   git push origin main
   ```
4. **Vercel auto-deploys** in 2-3 minutes
5. **Check live site** at https://boly-pi.vercel.app/

## 🛠️ Common Commands

### Start Development Server
```powershell
.\dev-frontend.bat
```

### Stop Server
Press `Ctrl+C` in the terminal

### Push Changes to GitHub & Vercel
```powershell
git add .
git commit -m "Your message"
git push origin main
```

### Check Git Status
```powershell
git status
```

## 💡 Tips

- **Local development**: Use `dev-frontend.bat` - changes appear instantly
- **Testing on Vercel**: Push to GitHub - see changes in 2-3 minutes
- **No need to restart**: Next.js auto-reloads on file changes
- **Browser refresh**: Usually automatic, but `Ctrl+R` if needed

## 🆘 Need Help?

- **Local server not starting?** Make sure you're in the project folder
- **Changes not showing?** Check browser console for errors
- **Vercel not updating?** Check deployment logs in Vercel dashboard
- **Git issues?** Run `git status` to see what's happening


