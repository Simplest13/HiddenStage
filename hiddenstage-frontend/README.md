# HiddenStage Frontend

The independent HiddenStage web frontend is a React 19, TypeScript, and Vite application. This assignment establishes routes, visual foundations, reusable controls, public homepage sections, and non-operational dashboard previews. No marketplace workflow or backend response is simulated.

## Requirements

- Node.js 22.19.0 was used for verification (use a Node release supported by the installed Vite version)
- npm

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The API base path defaults to `/api/v1`. Update `VITE_API_BASE_URL` in `.env.local` only when a backend environment is available.

## Quality commands

```powershell
npm run typecheck
npm run lint
npm test
npm run build
npm run test:e2e
```

Playwright is configured for Chromium. Install a browser once with `npx playwright install chromium` before running the end-to-end suite.

## Project map

- `src/app`: providers, route configuration, route constants, and route guards
- `src/features`: public, authentication, workspace, and system page modules
- `src/layouts`: public, authentication, and audience-specific workspace shells
- `src/shared`: UI primitives and the API integration boundary
- `src/shared/api/generated`: reserved for types generated from the backend OpenAPI document
- `e2e`: Playwright smoke tests
- `docs`: frontend architecture, design tokens, route map, and integration notes

Dashboard previews and auth pages are intentionally non-operational. Session auth, role/permission decisions, provider matching, quote creation, request submission, and commitments require the backend and approved product contracts.
