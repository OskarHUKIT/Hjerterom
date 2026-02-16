# Quick Start: Publishing Your App

## 🚀 Fast Track to Publishing

This is a condensed guide to get you publishing ASAP. For detailed instructions, see [PUBLISHING_GUIDE.md](./PUBLISHING_GUIDE.md).

---

## Step 1: Install & Setup (5 minutes)

```powershell
# Install dependencies
cd frontend
npm install

# Set up Capacitor platforms
cd ..
.\setup-mobile.ps1
```

---

## Step 2: Get Developer Accounts

- **Apple Developer:** [developer.apple.com](https://developer.apple.com/programs/) - $99/year
- **Google Play:** [play.google.com/console](https://play.google.com/console) - $25 one-time

⏱️ **Wait time:** 24-48 hours for Apple approval

---

## Step 3: Prepare Assets

### App Icon
- Create 1024x1024px PNG
- Use [AppIcon.co](https://www.appicon.co/) to generate all sizes
- See [ICON_SPLASH_SETUP.md](./ICON_SPLASH_SETUP.md) for details

### Screenshots
- **iOS:** 1290x2796px (iPhone 6.5")
- **Android:** Phone screenshots (16:9 or 9:16 ratio)

### Privacy Policy
- **Required!** Create a privacy policy page
- Host it on your website or GitHub Pages
- You'll need the URL for both stores

---

## Step 4: Build Your App

```powershell
# Build for mobile
.\build-mobile.ps1
```

---

## Step 5: Publish iOS (macOS Required)

```powershell
cd frontend
npm run cap:open:ios
```

Then in Xcode:
1. **Signing:** Select your Apple Developer team
2. **Archive:** Product → Archive
3. **Upload:** Distribute App → App Store Connect
4. **Submit:** Go to App Store Connect → Fill in details → Submit

📖 **Full guide:** See [PUBLISHING_GUIDE.md](./PUBLISHING_GUIDE.md#-step-3-publishing-to-ios-app-store)

---

## Step 6: Publish Android

```powershell
cd frontend\android

# Generate signing key (one-time)
keytool -genkey -v -keystore boligbanken-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias boligbanken

# Build release bundle
.\gradlew bundleRelease
```

Then:
1. Go to [Play Console](https://play.google.com/console)
2. Create app → Fill in details
3. Upload `app-release.aab` from `android/app/build/outputs/bundle/release/`
4. Complete store listing → Submit

📖 **Full guide:** See [PUBLISHING_GUIDE.md](./PUBLISHING_GUIDE.md#-step-4-publishing-to-google-play-store)

---

## Step 7: Future Updates (Super Easy!)

```powershell
# Make your code changes, then:
.\update-mobile-app.ps1 -Version "1.0.1" -BuildNumber "2"

# Follow the prompts to upload to stores
```

That's it! 🎉

---

## ⚠️ Important Notes

1. **iOS requires macOS** - You can't build iOS apps on Windows
2. **Keep your Android keystore safe** - You'll need it for all future updates
3. **Privacy Policy is mandatory** - Both stores require it
4. **First review takes longer** - Be patient (1-7 days)

---

## Need Help?

- **Detailed guide:** [PUBLISHING_GUIDE.md](./PUBLISHING_GUIDE.md)
- **Icons & splash:** [ICON_SPLASH_SETUP.md](./ICON_SPLASH_SETUP.md)
- **Capacitor docs:** [capacitorjs.com/docs](https://capacitorjs.com/docs)

---

## Estimated Timeline

- **Setup:** 2-4 hours
- **First build:** 1-2 hours  
- **Store submission:** 1-2 hours
- **Review:** 1-7 days

**Total:** ~1 week from start to published app

Good luck! 🚀
