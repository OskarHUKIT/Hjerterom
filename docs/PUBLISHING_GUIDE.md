# Complete Publishing Guide: App Store & Google Play

This guide will take you from zero to published app on both iOS App Store and Google Play Store.

## 📋 Prerequisites Checklist

### Required Accounts
- [ ] **Apple Developer Account** ($99/year) - [Sign up here](https://developer.apple.com/programs/)
- [ ] **Google Play Developer Account** ($25 one-time) - [Sign up here](https://play.google.com/console/signup)

### Required Software
- [ ] **Xcode** (macOS only, for iOS builds) - Download from Mac App Store
- [ ] **Android Studio** (for Android builds) - [Download here](https://developer.android.com/studio)
- [ ] **Node.js** (already installed)
- [ ] **Git** (already installed)

### Required Assets
- [ ] App icon (1024x1024px PNG for iOS, 512x512px PNG for Android)
- [ ] Screenshots (see sizes below)
- [ ] Privacy Policy URL (required by both stores)
- [ ] App description and keywords

---

## 🚀 Step 1: Initial Setup (One-Time)

### 1.1 Install Dependencies

```powershell
# Navigate to frontend directory
cd frontend

# Install all dependencies (including Capacitor)
npm install
```

### 1.2 Set Up Capacitor Platforms

```powershell
# Run the setup script
cd ..
.\setup-mobile.ps1
```

This will:
- Install Capacitor dependencies
- Add iOS and Android platforms
- Build the app for the first time
- Sync with Capacitor

**Note:** If you're on Windows and don't have macOS, you can only build Android apps locally. iOS builds require macOS/Xcode.

---

## 📱 Step 2: Configure App Identity

### 2.1 Update App Information

Edit `frontend/capacitor.config.ts`:

```typescript
{
  appId: 'com.boligbanken.app',  // Change to your unique app ID
  appName: 'Boligbanken',        // Your app display name
  // ... rest of config
}
```

**Important:** The `appId` must be unique and follow reverse domain notation (e.g., `com.yourcompany.appname`). Once published, you cannot change it.

### 2.2 Prepare App Icons

You need app icons in these sizes:

**iOS:**
- 1024x1024px (App Store icon)

**Android:**
- 512x512px (Play Store icon)
- 192x192px (App icon)
- Various sizes for different densities (will be generated automatically)

**Where to place icons:**
- iOS: `frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android: `frontend/android/app/src/main/res/` (various mipmap folders)

**Tool to generate icons:** Use [AppIcon.co](https://www.appicon.co/) or [IconKitchen](https://icon.kitchen/) to generate all required sizes from a single 1024x1024px image.

---

## 🍎 Step 3: Publishing to iOS App Store

### 3.1 Set Up Apple Developer Account

1. Go to [developer.apple.com](https://developer.apple.com)
2. Sign up for Apple Developer Program ($99/year)
3. Wait for approval (usually 24-48 hours)

### 3.2 Configure Xcode Project

```powershell
cd frontend
npm run mobile:ios
```

This opens Xcode. Then:

1. **Select your project** in the left sidebar (Boligbanken)
2. **Select the target** (Boligbanken)
3. Go to **"Signing & Capabilities"** tab
4. Check **"Automatically manage signing"**
5. Select your **Team** (your Apple Developer account)
6. Xcode will automatically create provisioning profiles

### 3.3 Configure App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platform:** iOS
   - **Name:** Boligbanken
   - **Primary Language:** Your language
   - **Bundle ID:** Select the one matching your `appId` (com.boligbanken.app)
   - **SKU:** Unique identifier (e.g., BOLIGBANKEN001)
   - **User Access:** Full Access

### 3.4 Build and Archive

In Xcode:

1. Select **"Any iOS Device"** or your connected device from the device dropdown
2. Go to **Product** → **Archive**
3. Wait for the archive to complete
4. The **Organizer** window will open automatically

### 3.5 Upload to App Store Connect

In Xcode Organizer:

1. Select your archive
2. Click **"Distribute App"**
3. Choose **"App Store Connect"**
4. Click **"Upload"**
5. Follow the wizard (select your team, etc.)
6. Wait for upload to complete (may take 10-30 minutes)

### 3.6 Submit for Review

In App Store Connect:

1. Go to your app → **"App Store"** tab
2. Fill in required information:
   - **App Information:** Description, keywords, support URL
   - **Pricing and Availability:** Set price (Free or Paid)
   - **App Privacy:** Complete privacy questionnaire
   - **Version Information:**
     - Version number (e.g., 1.0.0)
     - What's New description
     - Screenshots (required):
       - iPhone 6.5" Display: 1290x2796px or 1284x2778px
       - iPhone 5.5" Display: 1242x2208px
       - iPad Pro (12.9"): 2048x2732px
   - **App Review Information:**
     - Contact information
     - Demo account (if needed)
     - Notes (optional)
3. Click **"Add for Review"**
4. Click **"Submit for Review"**

### 3.7 Review Process

- **Typical review time:** 1-3 days
- You'll receive email notifications about status changes
- If rejected, Apple will provide feedback

---

## 🤖 Step 4: Publishing to Google Play Store

### 4.1 Set Up Google Play Developer Account

1. Go to [play.google.com/console](https://play.google.com/console)
2. Pay the $25 one-time registration fee
3. Complete your developer profile

### 4.2 Generate Signing Key (One-Time)

**Important:** Keep this key safe! You'll need it for all future updates.

```powershell
cd frontend\android\app

# Generate a keystore (replace with your details)
keytool -genkey -v -keystore boligbanken-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias boligbanken

# You'll be prompted for:
# - Password (remember this!)
# - Your name, organization, etc.
```

### 4.3 Configure Android Signing

Create `frontend/android/key.properties`:

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=boligbanken
storeFile=../app/boligbanken-release-key.jks
```

**⚠️ SECURITY:** Add `key.properties` and `*.jks` to `.gitignore`! Never commit these files.

Update `frontend/android/app/build.gradle` (add before `android` block):

```gradle
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

And update the `android` block:

```gradle
android {
    ...
    signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

### 4.4 Build Release APK/AAB

```powershell
cd frontend\android

# Build App Bundle (recommended for Play Store)
.\gradlew bundleRelease

# OR build APK (for testing)
.\gradlew assembleRelease
```

**Output locations:**
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

### 4.5 Create App in Play Console

1. Go to [Play Console](https://play.google.com/console)
2. Click **"Create app"**
3. Fill in:
   - **App name:** Boligbanken
   - **Default language:** Your language
   - **App or game:** App
   - **Free or paid:** Your choice
   - **Declarations:** Accept policies

### 4.6 Complete Store Listing

In Play Console → **Store presence** → **Main store listing**:

- **App name:** Boligbanken
- **Short description:** (80 characters max)
- **Full description:** (4000 characters max)
- **App icon:** 512x512px PNG
- **Feature graphic:** 1024x500px PNG
- **Screenshots:** 
  - Phone: At least 2, max 8 (16:9 or 9:16 ratio)
  - Tablet: Optional (7" and 10")
- **Privacy Policy URL:** Required!

### 4.7 Set Up Content Rating

1. Go to **Content rating**
2. Complete the questionnaire
3. Submit for rating (usually instant)

### 4.8 Set Up App Access

1. Go to **App access**
2. Select if your app is:
   - Available to everyone
   - Restricted (requires login, etc.)

### 4.9 Upload App Bundle

1. Go to **Production** → **Create new release**
2. Upload your `.aab` file (from Step 4.4)
3. Add **Release notes** (what's new in this version)
4. Click **"Review release"**
5. Review and click **"Start rollout to Production"**

### 4.10 Review Process

- **Typical review time:** 1-7 days
- Usually faster than iOS
- You'll receive email notifications

---

## 🔄 Step 5: Future Updates (The Easy Part!)

Once your app is published, updating is simple:

### 5.1 Update Your Code

Make your changes in `frontend/` as usual. Test in browser first.

### 5.2 Build for Mobile

```powershell
.\build-mobile.ps1
```

### 5.3 Update Version Numbers

**iOS:** In Xcode → Select target → General → Version & Build
- Increment **Version** (e.g., 1.0.0 → 1.0.1)
- Increment **Build** number (e.g., 1 → 2)

**Android:** In `frontend/android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 2  // Increment this
        versionName "1.0.1"  // Update this
    }
}
```

### 5.4 Build and Upload

**iOS:**
1. `npm run mobile:ios` (opens Xcode)
2. Product → Archive
3. Distribute App → Upload
4. Update App Store Connect listing
5. Submit for review

**Android:**
1. `cd frontend\android`
2. `.\gradlew bundleRelease`
3. Upload new `.aab` in Play Console
4. Add release notes
5. Rollout

---

## 📝 Required Assets Checklist

### App Icons
- [ ] iOS: 1024x1024px PNG
- [ ] Android: 512x512px PNG

### Screenshots

**iOS:**
- [ ] iPhone 6.5" (1290x2796px) - At least 1, max 10
- [ ] iPhone 5.5" (1242x2208px) - Optional
- [ ] iPad Pro 12.9" (2048x2732px) - Optional

**Android:**
- [ ] Phone screenshots (16:9 or 9:16) - At least 2, max 8
- [ ] Tablet screenshots - Optional
- [ ] Feature graphic: 1024x500px PNG

### Legal/Policy
- [ ] Privacy Policy URL (required!)
- [ ] Terms of Service URL (recommended)
- [ ] Support URL

### Descriptions
- [ ] App name
- [ ] Short description (iOS: 30 chars, Android: 80 chars)
- [ ] Full description (iOS: 4000 chars, Android: 4000 chars)
- [ ] Keywords (iOS only, 100 chars max)
- [ ] What's New (for updates)

---

## 🛠️ Troubleshooting

### iOS Issues

**"No signing certificate found"**
- Solution: In Xcode → Signing & Capabilities → Select your team

**"Bundle identifier already in use"**
- Solution: Change `appId` in `capacitor.config.ts` to something unique

**Archive fails**
- Solution: Clean build folder (Product → Clean Build Folder), then try again

### Android Issues

**"Keystore file not found"**
- Solution: Make sure `key.properties` path is correct

**"Gradle build failed"**
- Solution: Update Android SDK in Android Studio → SDK Manager

**"App not compatible with device"**
- Solution: Check `minSdkVersion` in `build.gradle` (should be 22+)

---

## 📚 Additional Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policies](https://play.google.com/about/developer-content-policy/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [Play Console Help](https://support.google.com/googleplay/android-developer)

---

## ✅ Quick Reference Commands

```powershell
# Initial setup (one-time)
.\setup-mobile.ps1

# Build for mobile
.\build-mobile.ps1

# Open in native IDEs
cd frontend
npm run cap:open:ios      # macOS only
npm run cap:open:android  # Windows/macOS/Linux

# Sync after code changes
cd frontend
npm run cap:sync
```

---

## 🎉 You're Ready!

Follow this guide step-by-step, and you'll have your app published in no time. The first time takes longer, but future updates are quick and easy!

**Estimated Timeline:**
- **Setup:** 2-4 hours
- **First build:** 1-2 hours
- **Store submission:** 1-2 hours
- **Review:** 1-7 days (varies by platform)

Good luck! 🚀
