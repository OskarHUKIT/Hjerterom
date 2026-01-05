# Logo Setup Instructions

## How to Add Your Logo

1. **Take a screenshot** of the logo from the left side of your design (the abstract house icon with "Bo.ly" text)

2. **Save the image** as one of these formats:
   - `logo.png` (recommended)
   - `logo.svg` (best quality)
   - `logo.jpg` (if needed)

3. **Place the file** in this folder: `frontend/public/logo.png`

4. **The app will automatically use it** in the header

## File Location

```
frontend/
  └── public/
      └── logo.png  ← Place your logo here
```

## Image Requirements

- **Format**: PNG, SVG, or JPG
- **Size**: Recommended 120x120px or larger (will be scaled to 60x60px)
- **Background**: Transparent PNG preferred, or white background
- **Name**: Must be exactly `logo.png` (or update the path in `layout.tsx`)

## Current Status

The app is set up to use `/logo.png`. If the file doesn't exist, a fallback placeholder will be shown.

## Testing

After adding the logo:
1. Restart your dev server if it's running
2. Refresh your browser
3. The logo should appear in the header


