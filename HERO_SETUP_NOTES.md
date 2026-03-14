# Sonartra Premium Hero (Next.js + TypeScript + Tailwind + Framer Motion)

This repo currently does not include a full Next.js scaffold, so the hero has been delivered as production-ready components under:

- `components/hero/Hero.tsx`
- `components/hero/IntelligenceTriangle.tsx`
- `components/hero/PulseRings.tsx`
- `components/hero/BackgroundSignals.tsx`
- `components/hero/SonartraMark.tsx`
- `app/page.tsx` (example usage)

## Required package

Install Framer Motion in your Next app:

```bash
npm install framer-motion
```

Tailwind utility classes are already used directly in the component markup. If your app does not yet have Tailwind configured, initialize it first with the standard Next.js + Tailwind setup.

## Notes

- The implementation is mobile-first and includes `prefers-reduced-motion` handling through `useReducedMotion`.
- Pointer responsiveness is intentionally subtle and self-disables for reduced motion users.
- `SonartraMark.tsx` is a temporary editable geometric placeholder mark.
