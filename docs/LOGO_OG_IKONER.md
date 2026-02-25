# Slik endrer du logo og ikoner

## 1. Logo ved «Legg til på hjemskjerm» (PWA-ikon)

Når brukeren legger appen til på hjemskjermen i nettleseren, vises ikonet fra manifestet.

### Steg:

1. **Lag ikonene** i disse størrelsene:
   - `icon-192x192.png` (192×192 piksler)
   - `icon-512x512.png` (512×512 piksler)

2. **Legg filene** i mappen `frontend/public/`

3. **Oppdater** `frontend/public/manifest.json` – bytt ut `/logo.png` med de nye filene:

```json
"icons": [
  {
    "src": "/icon-192x192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any maskable"
  },
  {
    "src": "/icon-512x512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any maskable"
  }
]
```

4. **Oppdater** `frontend/app/layout.tsx` – endre apple-ikonet:

```typescript
icons: { apple: '/icon-192x192.png' },
```

---

## 2. Startskjerm (splash screen)

Startskjermen er skjermen som vises mens appen starter.

### For PWA (nettleser)

PWA har ikke egen splash-skjerm – brukeren ser bare forsiden som lastes. Du kan endre bakgrunnsfarge i `manifest.json`:

```json
"background_color": "#0f172a",
"theme_color": "#3b82f6"
```

### For native app (Capacitor / iOS + Android)

**iOS:**
- Åpne `frontend/ios/App/App/Assets.xcassets/Splash.imageset/`
- Bytt ut bildene med dine egne:
  - `splash-2732x2732.png` (2732×2732 px – anbefalt for alle skjermer)
  - `splash-2732x2732-1.png` (2x)
  - `splash-2732x2732-2.png` (1x)

**Android:**
- Splash bruker `ic_launcher` som standard – samme ikon som app-ikonet
- For egen splash: Opprett `frontend/android/app/src/main/res/drawable/splash.png` og oppdater `styles.xml` (se `docs/ICON_SPLASH_SETUP.md`)

---

## 3. Rask løsning – bruk én logo for alt

Hvis du har én logo-fil (f.eks. `logo.png`):

1. Lag en 512×512 px versjon
2. Lagre som `frontend/public/icon-512x512.png`
3. Kopier den og lagre som `icon-192x192.png` (reduser til 192×192 i et bildeverktøy)
4. Oppdater `manifest.json` som vist over

**Tips:** Bruk [IconKitchen](https://icon.kitchen/) eller [AppIcon.co](https://www.appicon.co/) – last opp én logo, last ned alle størrelser.
