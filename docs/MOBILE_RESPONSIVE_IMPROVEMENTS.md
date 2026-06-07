# Mobile Responsiveness Improvements

Summary of changes made to improve the phone experience:

## Viewport & Meta

- **Layout (`layout.tsx`)**: `viewportFit: 'cover'` for notch/inset handling, `interactiveWidget: 'resizes-content'` to reduce layout jumps when the virtual keyboard opens.
- **`-webkit-text-size-adjust: 100%`** in `globals.css` to prevent font inflation on iOS.

## Touch Targets

- Buttons use `min-height: var(--touch-target)` (44px) / `var(--touch-target-sm)` (40px) on mobile for easier tapping.
- Portal cards on the home page have touch-friendly CTA buttons.
- Input fields use at least 16px font size on mobile to prevent iOS auto-zoom on focus.

## Layout

- **Home page**: Portal grid switches to a single column on small screens; clear “Velg din rolle” split between utleier and kommunebruker.
- **Database page**: Table view has horizontal scroll (`overflow-x: auto`) with `-webkit-overflow-scrolling: touch` for smooth scrolling on iOS.
- **Grid**: `minmax(min(100%, 340px), 1fr)` so cards fit narrow screens.
- **Safe area**: `env(safe-area-inset-left/right)` used for padding where relevant.

## Tables

- Database table wrapper uses horizontal scroll instead of squashing content.
- Table has `min-width: 600px` (500px on very small screens) so horizontal scroll works.
- Reduced cell padding on mobile to fit more content.

## Testing

Use Chrome DevTools Device Toolbar or test on a real device:
1. iPhone SE (375px)
2. iPhone 14 (390px)
3. Android phones (360px–412px)
4. Responsive mode down to 320px

## Added (Feb 2025)

- **Header**: Safe-area padding (`env(safe-area-inset-left/right)`) for notch/rounded corners.
- **MapView**: Responsiv høyde `min(600px, 70vh)` → mindre på mobil (55–60vh), min-høyde 250–300px.
- **Database-knapper**: Touch-vennlig min-høyde/bredde (44px) på mobil.
- **Hero**: Mindre padding og responsiv font på små skjermer.

## Further Improvements (Optional)

- Add bottom tab bar for mobile navigation (common in native-style apps).
- Consider collapsible table rows (accordion) for very narrow screens instead of horizontal scroll.
- Add pull-to-refresh for lists if needed.
