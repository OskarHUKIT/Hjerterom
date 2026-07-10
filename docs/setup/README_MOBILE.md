# Mobile App Publishing Setup

Your Boligbanken app is now configured for mobile app store publishing! 🎉

## 📱 What's Been Set Up

✅ Capacitor installed and configured  
✅ iOS and Android platforms ready  
✅ Build scripts created  
✅ Publishing guides written  
✅ Update workflow automated  

## 🚀 Quick Start

### First Time Setup

```powershell
# 1. Install dependencies
cd frontend
npm install

# 2. Set up mobile platforms
cd ..
.\setup-mobile.ps1
```

### Build for Mobile

```powershell
.\build-mobile.ps1
```

### Publish Your App

See the comprehensive guides:
- **Quick Start:** [docs/QUICK_PUBLISH_START.md](./docs/QUICK_PUBLISH_START.md)
- **Full Guide:** [docs/PUBLISHING_GUIDE.md](./docs/PUBLISHING_GUIDE.md)
- **Icons & Assets:** [docs/ICON_SPLASH_SETUP.md](./docs/ICON_SPLASH_SETUP.md)

## 🔄 Future Updates

When you want to release a new version:

```powershell
# Make your code changes first, then:
.\update-mobile-app.ps1 -Version "1.0.1" -BuildNumber "2"
```

This will:
1. Build your Next.js app
2. Sync with Capacitor
3. Update version numbers
4. Build release packages
5. Guide you through uploading to stores

## 📚 Available Scripts

### Root Level
- `.\setup-mobile.ps1` - Initial setup (run once)
- `.\build-mobile.ps1` - Build app for mobile
- `.\update-mobile-app.ps1` - Update workflow for new releases

### Frontend Level (`cd frontend`)
- `npm run build:mobile` - Build Next.js for mobile (static export)
- `npm run cap:sync` - Sync web code to native projects
- `npm run cap:open:ios` - Open iOS project in Xcode
- `npm run cap:open:android` - Open Android project in Android Studio
- `npm run mobile:ios` - Build + sync + open iOS
- `npm run mobile:android` - Build + sync + open Android

## 📋 Prerequisites

Before publishing, you'll need:

1. **Apple Developer Account** ($99/year) - [Sign up](https://developer.apple.com/programs/)
2. **Google Play Developer Account** ($25 one-time) - [Sign up](https://play.google.com/console)
3. **Xcode** (macOS only, for iOS) - Download from Mac App Store
4. **Android Studio** (for Android) - [Download](https://developer.android.com/studio)

## 🎯 Next Steps

1. **Get developer accounts** (see above)
2. **Prepare app icons** - See [ICON_SPLASH_SETUP.md](./docs/ICON_SPLASH_SETUP.md)
3. **Create privacy policy** - Required by both stores
4. **Follow publishing guide** - [PUBLISHING_GUIDE.md](./docs/PUBLISHING_GUIDE.md)

## ⚠️ Important Notes

- **iOS builds require macOS** - You can't build iOS apps on Windows
- **Keep Android keystore safe** - You'll need it for all future updates
- **Privacy Policy is mandatory** - Both stores require a URL
- **First review takes 1-7 days** - Be patient!

## 📖 Documentation

- [Quick Publish Start](./docs/QUICK_PUBLISH_START.md) - Fast track guide
- [Complete Publishing Guide](./docs/PUBLISHING_GUIDE.md) - Step-by-step instructions
- [Icon & Splash Setup](./docs/ICON_SPLASH_SETUP.md) - Asset preparation
- [Capacitor Detailed Guide](./docs/CAPACITOR_DETAILED_GUIDE.md) - Technical details

## 🆘 Troubleshooting

**Build fails?**
- Make sure all dependencies are installed: `cd frontend && npm install`
- Check Node.js version (should be 18+)

**Capacitor sync fails?**
- Make sure you've run `npm install` first
- Try deleting `node_modules` and reinstalling

**iOS/Android folders missing?**
- Run `.\setup-mobile.ps1` to add platforms

**Need help?**
- Check the detailed guides in `docs/`
- Capacitor docs: [capacitorjs.com/docs](https://capacitorjs.com/docs)

---

**You're all set!** Follow the publishing guides to get your app on the stores. 🚀
