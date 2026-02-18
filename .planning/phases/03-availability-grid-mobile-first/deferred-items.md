# Deferred Items — Phase 03

## Pre-existing Issues (Out of Scope)

### Build failure: RESEND_API_KEY missing
- **Route:** `/api/participants/magic-link/request`
- **Error:** `Missing API key. Pass it to the constructor new Resend("re_123")`
- **Cause:** `new Resend(process.env.RESEND_API_KEY)` instantiated at module level — throws when env var absent during `next build` page-data collection
- **Origin:** Phase 2 Plan 02 — already tracked in STATE.md blocking issues
- **Resolution:** Set `RESEND_API_KEY` in production environment (Vercel) and in `.env.local` for local builds. Deferred to deployment.
- **Impact:** Production `npm run build` fails. Dev server (`npm run dev`) works normally. All Phase 3 features function correctly.
