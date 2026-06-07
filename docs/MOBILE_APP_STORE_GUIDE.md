# Mobile App Store Deployment Guide

This guide outlines the steps needed to get your Boligbanken Next.js application on the App Store (iOS) and Google Play (Android).

## Overview

Your current app is a **Next.js web application**. To publish it on mobile app stores, you have three main options:

1. **Capacitor** (Recommended) - Wrap your web app in a native container
2. **Progressive Web App (PWA)** - Convert to PWA and distribute via stores
3. **React Native** - Complete rewrite (most native, most work)

---

## Option 1: Capacitor (Recommended for Your Use Case)

**Best for:** Keeping your existing Next.js codebase with minimal changes

### What is Capacitor?
Capacitor wraps your web app in a native container, giving you access to native device features (camera, push notifications, etc.) while keeping your existing React/Next.js code.

### Steps Required:

#### 1. Install Capacitor
```bash
cd frontend
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npx cap init
```

#### 2. Configure Capacitor
- App name: `Boligbanken`
- App ID: `com.boligbanken.app` (or your domain)
- Web directory: `.next` (or `out` if using static export)

#### 3. Add Native Platforms
```bash
npx cap add ios
npx cap add android
```

#### 4. Build Your Next.js App
```bash
npm run build
```

#### 5. Sync to Native Projects
```bash
npx cap sync
```

#### 6. Open in Native IDEs
```bash
# iOS (requires macOS)
npx cap open ios

# Android
npx cap open android
```

### Required Changes to Your Code:

1. **Update `next.config.js`** to support static export or configure for Capacitor:
```javascript
const nextConfig = {
  output: 'export', // For static export
  // OR keep SSR but configure basePath for Capacitor
  basePath: '',
  assetPrefix: '',
}
```

2. **Add Capacitor configuration** (`capacitor.config.json`):
```json
{
  "appId": "com.boligbanken.app",
  "appName": "Boligbanken",
  "webDir": ".next",
  "bundledWebRuntime": false,
  "server": {
    "url": "https://boly-pi.vercel.app",
    "cleartext": true
  }
}
```

3. **Handle deep linking** and native navigation

### App Store Requirements:

#### iOS (App Store):
- **Apple Developer Account**: $99/year
- **Xcode**: macOS required for building
- **App Store Connect**: Set up app listing
- **Required Assets**:
  - App icon (1024x1024px)
  - Screenshots (various sizes for iPhone/iPad)
  - Privacy policy URL
  - App description
  - Keywords
  - Support URL

#### Android (Google Play):
- **Google Play Developer Account**: $25 one-time fee
- **Android Studio**: For building and testing
- **Google Play Console**: Set up app listing
- **Required Assets**:
  - App icon (512x512px)
  - Screenshots (phone/tablet)
  - Feature graphic (1024x500px)
  - Privacy policy URL
  - App description
  - Content rating questionnaire

### Estimated Timeline:
- **Setup & Configuration**: 1-2 days
- **Testing on Devices**: 2-3 days
- **App Store Submission**: 1-2 days
- **Review Process**: 
  - iOS: 1-3 days
  - Android: 1-7 days

---

## Option 2: Progressive Web App (PWA)

**Best for:** Quickest path to app stores with minimal native features

### Steps Required:

#### 1. Add PWA Support to Next.js
```bash
npm install next-pwa
```

#### 2. Update `next.config.js`:
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
})

module.exports = withPWA({
  // your existing config
})
```

#### 3. Create Web App Manifest (`public/manifest.json`):
```json
{
  "name": "Boligbanken",
  "short_name": "Boligbanken",
  "description": "Housing Bank Management System",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### 4. Add Service Worker Registration
Update `app/layout.tsx` to register the service worker.

#### 5. Create App Icons
- 192x192px and 512x512px PNG icons

### Distribution Options:

#### iOS (App Store):
- Use **PWABuilder** or **Bubblewrap** to create iOS wrapper
- Or use **Capacitor** (same as Option 1)

#### Android (Google Play):
- Use **TWA (Trusted Web Activity)** wrapper
- Or use **PWABuilder** to generate Android package

### Limitations:
- Limited native device access
- May feel less "native" than full apps
- Some features may not work offline

---

## Option 3: React Native (Complete Rewrite)

**Best for:** Maximum native performance and features

### What This Means:
- Rewrite your entire frontend in React Native
- Keep your backend API (no changes needed)
- Best native performance and UX
- Most work required

### Steps Required:

1. **Set up React Native project**
2. **Migrate components** from Next.js to React Native
3. **Set up navigation** (React Navigation)
4. **Configure API calls** to your existing backend
5. **Add native features** as needed
6. **Build and test** on both platforms

### Estimated Timeline:
- **Migration**: 2-4 weeks (depending on app complexity)
- **Testing**: 1-2 weeks
- **App Store Submission**: 1-2 days

---

## Recommended Approach: Capacitor

For your use case, **Capacitor (Option 1)** is recommended because:

✅ Keeps your existing Next.js codebase  
✅ Minimal code changes required  
✅ Access to native device features  
✅ Single codebase for web and mobile  
✅ Faster time to market  

---

## Pre-Submission Checklist

### Code Requirements:
- [ ] App works offline (or handles offline gracefully)
- [ ] All external links open in-app browser
- [ ] Back button handling (Android)
- [ ] Status bar styling
- [ ] Splash screen configured
- [ ] App icons for all required sizes
- [ ] Privacy policy implemented
- [ ] Terms of service accessible
- [ ] Error handling for network failures

### Legal & Compliance:
- [ ] Privacy policy URL (required by both stores)
- [ ] Terms of service
- [ ] GDPR compliance (if applicable)
- [ ] Data collection disclosure
- [ ] Cookie policy (if applicable)

### Assets Needed:
- [ ] App icon (iOS: 1024x1024, Android: 512x512)
- [ ] Screenshots (iOS: 6.5" iPhone, 12.9" iPad)
- [ ] Screenshots (Android: Phone, Tablet)
- [ ] Feature graphic (Android: 1024x500)
- [ ] App preview video (optional but recommended)

### Testing:
- [ ] Test on physical iOS devices
- [ ] Test on physical Android devices
- [ ] Test on different screen sizes
- [ ] Test offline functionality
- [ ] Test push notifications (if implemented)
- [ ] Test deep linking
- [ ] Test app updates

---

## Cost Breakdown

### One-Time Costs:
- **Google Play Developer**: $25 (one-time)
- **Apple Developer**: $99/year

### Ongoing Costs:
- **Apple Developer**: $99/year renewal
- **App hosting**: Your existing Vercel/hosting (no change)
- **Backend**: Your existing backend (no change)

### Optional Costs:
- **App Store Optimization (ASO) tools**: $0-50/month
- **Analytics**: Free (Firebase, etc.)
- **Crash reporting**: Free tiers available

---

## Next Steps

1. **Choose your approach** (recommend Capacitor)
2. **Set up developer accounts**:
   - [Apple Developer](https://developer.apple.com/programs/)
   - [Google Play Console](https://play.google.com/console/)
3. **Install Capacitor** and configure
4. **Build and test** on devices
5. **Prepare store assets** (icons, screenshots, descriptions)
6. **Submit for review**

---

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Next.js Static Export](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)
- [PWABuilder](https://www.pwabuilder.com/)

---

## Questions to Consider

1. **Do you need offline functionality?** (affects architecture choice)
2. **Do you need native features?** (camera, push notifications, etc.)
3. **What's your timeline?** (affects which option to choose)
4. **Do you have macOS for iOS builds?** (required for App Store)
5. **What's your budget?** ($124 first year, $99/year ongoing)

---

## Support

If you need help implementing any of these options, I can:
- Set up Capacitor configuration
- Create PWA manifest and service worker
- Generate app icons and splash screens
- Configure build scripts
- Set up native project structure

Let me know which approach you'd like to pursue!
