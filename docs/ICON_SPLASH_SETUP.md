# App Icon & Splash Screen Setup Guide

## Quick Setup

### Option 1: Using Online Tools (Recommended)

1. **Prepare your icon:**
   - Create a 1024x1024px PNG image with your app logo
   - Make sure it has no transparency (use a solid background)
   - Ensure it looks good at small sizes

2. **Generate all sizes:**
   - Go to [AppIcon.co](https://www.appicon.co/) or [IconKitchen](https://icon.kitchen/)
   - Upload your 1024x1024px image
   - Select platforms: iOS and Android
   - Download the generated icons

3. **Place icons:**

   **iOS:**
   - Extract the iOS icons
   - Place them in: `frontend/ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - Or use Xcode: Open the project → Select Assets.xcassets → AppIcon → Drag and drop icons

   **Android:**
   - Extract the Android icons
   - Place them in the appropriate `mipmap-*` folders:
     - `frontend/android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
     - `frontend/android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
     - `frontend/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
     - `frontend/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
     - `frontend/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)
   - Also create `ic_launcher_round.png` versions for round icons

### Option 2: Manual Setup

#### iOS Icons

Required sizes for iOS:
- 20x20 (@2x = 40x40, @3x = 60x60) - Notification
- 29x29 (@2x = 58x58, @3x = 87x87) - Settings
- 40x40 (@2x = 80x80, @3x = 120x120) - Spotlight
- 60x60 (@2x = 120x120, @3x = 180x180) - App
- 1024x1024 - App Store

#### Android Icons

Required sizes for Android:
- mdpi: 48x48px
- hdpi: 72x72px
- xhdpi: 96x96px
- xxhdpi: 144x144px
- xxxhdpi: 192x192px

## Splash Screen Setup

### iOS Splash Screen

1. Create a splash screen image (recommended: 1242x2688px for iPhone)
2. In Xcode:
   - Open `frontend/ios/App/App/Assets.xcassets/`
   - Create or edit `LaunchImage` or use `LaunchScreen.storyboard`
   - Or configure in `capacitor.config.ts` (see below)

### Android Splash Screen

1. Create splash screen drawable:
   - Create `frontend/android/app/src/main/res/drawable/splash.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/splash_background"/>
    <item>
        <bitmap
            android:gravity="center"
            android:src="@mipmap/ic_launcher"/>
    </item>
</layer-list>
```

2. Add splash background color in `frontend/android/app/src/main/res/values/colors.xml`:

```xml
<resources>
    <color name="splash_background">#FFFFFF</color>
</resources>
```

3. Update `frontend/android/app/src/main/res/values/styles.xml`:

```xml
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.Light.NoActionBar">
        <item name="android:windowBackground">@drawable/splash</item>
    </style>
</resources>
```

## Capacitor Configuration

The splash screen is already configured in `capacitor.config.ts`. You can customize it:

```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,        // Show duration in ms
    launchAutoHide: true,            // Auto-hide after duration
    backgroundColor: '#ffffff',       // Background color
    androidSplashResourceName: 'splash',  // Android drawable name
    androidScaleType: 'CENTER_CROP',  // Android scale type
    showSpinner: false,              // Show loading spinner
    iosSpinnerStyle: 'small',        // iOS spinner style
    spinnerColor: '#999999'          // Spinner color
  }
}
```

## Using Your Existing Logo

If you have a logo file in `frontend/public/logo.png`:

1. **Resize it to 1024x1024px** (use any image editor)
2. **Follow Option 1 above** to generate all sizes
3. **Place icons** as described

## Testing Icons

After placing icons:

1. **iOS:** Open Xcode → Build → Check if icons appear correctly
2. **Android:** Build APK → Install on device → Check home screen

## Troubleshooting

**Icons not showing:**
- Make sure filenames match exactly (case-sensitive)
- Clear build cache: `npm run cap:sync`
- Rebuild: `npm run mobile:build`

**Splash screen not working:**
- Check `capacitor.config.ts` configuration
- Make sure Android drawable files exist
- Rebuild the app

## Resources

- [AppIcon.co](https://www.appicon.co/) - Generate all icon sizes
- [IconKitchen](https://icon.kitchen/) - Alternative icon generator
- [Capacitor Splash Screen Plugin](https://capacitorjs.com/docs/apis/splash-screen)
