# Phase 1 Migration Audit and Status

## Repository audit (static implementation)

### Static pages
- `index.html` (marketing homepage and platform narrative)
- `assessment.html` (assessment flow shell)
- `signals.html` (signals information page)
- `results.html` (results page)

### Static scripts
- `questions.js` (question set / assessment data)
- `signals.js` (signals data and page behaviour)

### Static styles
- `styles.css` (global visual system and page styles used by static pages)

### Static assets
- `assets/Sonartra_Logo.svg`
- `assets/Sonartra_S_Mark.svg`
- `favicon.ico`
- `sonartra_favicon_black.ico`

## Existing Next.js-related code discovered
- `app/page.tsx` (previously mapped only to the hero component)
- `components/hero/Hero.tsx`
- `components/hero/IntelligenceTriangle.tsx`
- `components/hero/BackgroundSignals.tsx`
- `components/hero/PulseRings.tsx`
- `components/hero/SonartraMark.tsx`

## Phase 1 changes completed
1. Added a full Next.js + TypeScript app foundation (App Router compatible).
2. Added App Router layout and metadata.
3. Connected legacy stylesheet into Next via `app/globals.css`.
4. Migrated homepage content into `app/page.tsx` as the real App Router homepage entry.
5. Reused the premium `Hero` component at the top of the homepage.
6. Copied text-based brand SVG assets into `public/assets` for Next static serving.
7. Preserved legacy static files in place (`index.html`, `assessment.html`, `signals.html`, `results.html`, `styles.css`, `questions.js`, `signals.js`).

## What remains for later phases
- Migrate `signals.html` into `app/signals/page.tsx`.
- Migrate `assessment.html` into `app/assessment/page.tsx`.
- Migrate `results.html` into `app/results/page.tsx`.
- Port static JS logic from `questions.js` and `signals.js` into typed modules/hooks.
- Move legacy static assets to `public/` and update references globally.
- Replace links targeting `.html` routes with internal Next routes once pages are migrated.
- Add automated testing for migrated flows (component and route-level checks).
