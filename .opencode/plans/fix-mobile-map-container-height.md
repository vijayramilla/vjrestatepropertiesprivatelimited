# Fix: Google Maps "Oops" Error on Mobile

## Root Cause
The map container's height chain breaks on mobile browsers:

```
fixed wrapper (height: IMPLICIT from top:56px + bottom:0)
  → relative wrapper (height: 100% — fails to resolve on mobile browsers)
    → absolute inset-0 map container (height: 0 — parent has no usable height)
      → GoogleMap (initializes on 0px container → "Oops" overlay)
```

Mobile browsers (Chrome Android, iOS Safari) fail to resolve `height: 100%` 
inside a `position: fixed` element whose height is implicit (from top/bottom),
causing the Google Maps init to receive a zero-height container.

## Changes

### 1. `src/pages/BangaloreMap.tsx` — Outer wrapper height

**Line 507** — Replace implicit height with explicit `100dvh` calc:

BEFORE:
```
className="fixed inset-x-0 top-14 bottom-0 z-10 bg-gray-900 md:top-16"
```

AFTER:
```
className="fixed inset-x-0 top-14 z-10 bg-gray-900 md:top-16 h-[calc(100dvh-3.5rem)] md:h-[calc(100dvh-4rem)]"
```

- `bottom-0` removed (no longer needed with explicit height)
- `h-[calc(100dvh-3.5rem)]` replaces the implicit height on mobile
- `md:h-[calc(100dvh-4rem)]` replaces it on desktop (header is 4rem)

### 2. `src/pages/BangaloreMap.tsx` — Map container min-height

**Line 607** — Add explicit min-height fallback so the absolute-positioned
map container never gets zero height:

BEFORE:
```
className="absolute inset-0 min-h-0"
```

AFTER:
```
className="absolute inset-0 min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-4rem)]"
```

### 3. `index.html` — Viewport meta tag

**Line 7** — Add `viewport-fit=cover` for notched devices:

BEFORE:
```
content="width=device-width, initial-scale=1.0"
```

AFTER:
```
content="width=device-width, initial-scale=1.0, viewport-fit=cover"
```

## Verification
1. Open the map page in Chrome DevTools mobile emulation (iPhone 12/14, Pixel 7)
2. Open on a physical mobile device
3. Verify the map loads without the "Oops" error
4. Verify the map container fills the screen below the navbar
5. Verify the sidebar and filter panel still work correctly
