# RuleSight — frontend

Web app for **RuleSight**, agentic AI for banking regulatory compliance (ET AI Hackathon,
Problem Statement 1). It shows what the AI agents found in RBI regulations: obligations with
verified quotes, the bank's controls, ranked gaps with a full evidence trace, AI-drafted fixes for
human approval, regulatory changes between versions, agent runs and the audit log.

> **Start with the backend README** (`RuleSight-backend/README.md`). It explains the project,
> architecture, installation, demo data and API. This app needs that API running.

## Stack

React 19 · TypeScript · Vite · TanStack Query · React Router · Recharts · Framer Motion ·
Vitest + Testing Library · ESLint

## Run it

Requires **Node.js 22.22+** and the backend API on `http://127.0.0.1:8000`.

```powershell
npm ci
npm run dev
```

Open <http://localhost:5173> and sign in with a demo account (see the backend README; for example
`priya@rulesight.bank`, password = the backend's `DEMO_USER_PASSWORD`).

## Configuration

Optional `.env.local` (git-ignored; see [`.env.example`](.env.example)):

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | `/api/v1` | API base path or URL |
| `VITE_DEV_API_PROXY_TARGET` | `http://127.0.0.1:8000` | Where the dev server forwards `/api` |

No secrets belong in `VITE_*` variables: they are compiled into the browser bundle.
The app has no mock mode: everything shown comes from the API.

## Pages

| Page | Shows |
|---|---|
| Sign in | Email + password (JWT); buttons are shown only for actions your role allows |
| Dashboard | Open gaps by priority, coverage, latest run, accuracy panel |
| Documents | Upload (regulation, policy, risk control matrix, evidence) and run the pipeline |
| Changes | Version comparison, withdrawn circulars, change-driven gaps |
| Obligations / Controls | Extracted obligations with verbatim quotes; the bank's controls |
| Gaps → trace | RBI clause → obligation → controls → risk verdict → remediation → audit |
| Remediation | AI-drafted fixes to approve or reject |
| Knowledge graph · Agent runs · Audit log | Graph view, per-step AI telemetry, decision history |

## Checks

```powershell
npx tsc --noEmit
npx eslint . --max-warnings=0
npx vitest run
npx vite build
```

Tests stub the API with test-only data in `src/test/` (never imported by app code).
