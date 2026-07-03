# Premium AI Property Valuation Page

## Overview
Build a premium, mobile-responsive property valuation page inspired by SquareYards' e-Valuation but with superior design, AI-powered via OpenRouter, and using 21st.dev MCP components.

## Page Sections

### 1. Hero Section (full-viewport)
- Dark cinematic background with gradient orbs + subtle grid pattern
- `SparklesCore` particle animation overlay
- `CircularRevealHeading` for "AI Property Valuation" title
- Tagline: "Get instant, AI-powered property valuation for Bangalore"
- Glass pricing badge: "Starting ₹999" with strikethrough "₹2,000"
- `LiquidButton` CTA: "Get Your Valuation" (scrolls to form)
- `soundEngine.playPremiumActivate()` on page load

### 2. Valuation Form Section
Step-through form with glass card container:
- **Step 1: Property Type** — radio grid (Apartment, Independent House, Plot/Land, Commercial, PG Building) — use `GlassCard` with `interactive` prop
- **Step 2: Location** — autocomplete input with `BANGALORE_AREAS` data, with "Detect My Location" button using Geolocation API
- **Step 3: Details** — area (sqft), property age dropdown, facing dropdown, floor (for apartments), BHK (for residential), construction status
- **Submit button**: `LiquidButton` with `playPremiumActivate()` sound + loading spinner
- Animated step indicators with framer-motion

### 3. Valuation Results Section (animated reveal)
- **Main result**: `AnimateNumber` displaying estimated market value (large, premium typography)
- **4 metric cards** using `GlassCard` with `glow` prop:
  - Estimated Market Value (₹)
  - Price per Sqft (₹)
  - Expected Rental Yield (₹/mo)
  - Government Circle Rate (₹)
- **Confidence bar**: animated progress bar showing confidence %
- **AI Explanation**: text from OpenRouter explaining market factors
- **"Compare with similar properties"** CTA linking to Properties page
- **Share valuation** button with share functionality

### 4. How It Works Section
- 3-step process cards with `ContainerScroll` animation
- Step 1: Enter property details
- Step 2: AI analyzes market data
- Step 3: Get instant valuation report

### 5. Market Insights Section
- `CobeGlobeAnalytics` or simplified price heatmap cards
- Top localities in Bangalore with avg price/sqft (hardcoded reference data)
- Price trend indicator (up/down arrow with %)

### 6. FAQ Section
- Accordion-style FAQ (6-8 questions about property valuation)
- Uses `AnimatePresence` for smooth expand/collapse

## Files to Create

### `src/pages/PremiumValuationPage.tsx`
Main page component composing all sections. Handles form state, API calls, result display.

### `src/utils/aiValuation.ts`
OpenRouter API integration for property valuation.

**Prompt structure:**
```
You are a real estate valuation expert for Bangalore, India. 
Given the following property details, provide an accurate market valuation:

Property Type: {type}
Locality: {locality}
Area: {area} sqft
Age: {age}
Facing: {facing}
Floor: {floor}
BHK: {bhk}
Construction Status: {status}

Consider:
- Recent comparable sales in {locality}
- Current market trends in Bangalore real estate
- Property type premiums/discounts
- Age depreciation
- Floor and facing adjustments
- Circle rate / government guidance value

Return a JSON object ONLY:
{
  "marketValue": <number in INR>,
  "pricePerSqft": <number>,
  "rentalYield": <number per month>,
  "circleRate": <number per sqft>,
  "confidenceScore": <0-100>,
  "explanation": "<2-3 sentence plain English explanation>",
  "comparableLocalities": ["<locality1>", "<locality2>"],
  "trend": "<up|down|stable>",
  "trendPercentage": <number>
}
```

**Model:** `google/gemini-2.5-flash` (same as existing pattern)
**Error handling:** returns null on failure, page shows "Could not complete valuation" with retry

### `src/components/valuation/ValuationForm.tsx`
Multi-step form component with:
- Step indicator (animated dots/numbers)
- Property type selector (interactive GlassCard grid)
- Locality autocomplete using `BANGALORE_AREAS` + `filterLocalities()`
- Input fields: area, age, facing, floor, BHK, status
- Form validation
- Submit handling with loading state

### `src/components/valuation/ValuationResults.tsx`
Results display with:
- AnimateNumber for main value
- 4 GlassCard metrics
- Confidence bar
- AI explanation text
- Share button
- "Valuate Another Property" button

### `src/components/valuation/HowItWorks.tsx`
3-step process with ContainerScroll animation.

### `src/components/valuation/FaqSection.tsx`
Accordion FAQ with AnimatePresence.

## Files to Modify

### `src/App.tsx`
Add route:
```tsx
const PremiumValuationPage = lazy(() => import('./pages/PremiumValuationPage'));
// Inside <Route element={<Layout />}>
<Route path="/property-valuation" element={<LazyPage><PremiumValuationPage /></LazyPage>} />
```

### `src/components/Navbar.tsx`
Add nav link (desktop center links + mobile menu):
```tsx
{ label: 'Valuation', path: '/property-valuation' }
```
Place after "Land Map" or "Properties".

## Reusable Components to Use

| Component | Import Path | Usage |
|-----------|-------------|-------|
| `GlassCard` | `@/components/ui/glass-card` | Form container, metric cards, feature cards |
| `SparklesCore` | `@/components/ui/sparkles` | Hero particle background |
| `ContainerScroll` | `@/components/ui/container-scroll-animation` | How It Works section |
| `AnimateNumber` | `@/components/ui/animated-blur-number` | Valuation figure animation |
| `CircularRevealHeading` | `@/components/ui/circular-reveal-heading` | Hero title |
| `LiquidButton` | `@/components/ui/liquid-glass-button` | Primary CTAs |
| `Button` | `@/components/ui/button` | Secondary CTAs |
| `Input` | `@/components/ui/input` | Form inputs |

## Utilities to Use

| Utility | Import Path | Usage |
|---------|-------------|-------|
| `soundEngine` | `@/utils/soundEngine` | Premium sounds |
| `cn()` | `@/lib/utils` | Class merging |
| `siteContact` | `@/data/siteContact` | Contact info |
| `BANGALORE_AREAS` | `@/data/properties` | Locality dropdown |
| `filterLocalities()` | `@/data/properties` | Locality autocomplete |
| `formatPrice()` | `@/lib/formatPrice` | Price formatting |
| `formatINRCompact()` | `@/lib/formatPrice` | Compact price |

## Libraries
- `framer-motion` (already installed) — animations
- `@phosphor-icons/react` (already installed) — icons
- `lucide-react` (already installed) — fallback icons

## Color Palette
- Dark: `#0a0a0a` to `#1a1a1a` (gradient backgrounds)
- Gold/Amber accent: `#f59e0b` (valuation highlights)
- Emerald accent: `#10b981` (positive trends)
- Glass: `bg-white/5 backdrop-blur-xl` (glass cards)
- Text: white/off-white on dark, gray-900 on light sections

## Mobile Responsiveness
- Form collapses to single column on mobile
- Step indicator adapts to horizontal scroll on mobile
- Results stack vertically on mobile (<768px)
- All touch targets min 44px
- Safe area insets respected
- Section padding: `px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16`

## Verification
1. `npm run build` — must pass
2. Navigate to `/property-valuation` on desktop + mobile
3. Complete form and verify valuation API call returns result
4. Verify all animations play smoothly
5. Verify nav link appears in desktop menu and mobile hamburger
