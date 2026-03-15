# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run test       # Jest (single run)
npm run test:watch # Jest watch mode
npm run test:coverage # Jest with coverage
```

Run a single test file:

```bash
npx jest __tests__/lib/credits.test.ts
```

> Note: `eslint.ignoreDuringBuilds: true` and `typescript.ignoreBuildErrors: true` are set in `next.config.mjs` — build does not fail on TS/lint errors.

## Architecture

**Next.js 14 App Router** project. All pages live under `src/app/`, API routes under `src/app/api/`.

### Pages

| Route                | Entry                                                        |
| -------------------- | ------------------------------------------------------------ |
| `/`                  | `MapWorld` — interactive SVG world map (`react-simple-maps`) |
| `/auth`              | Firebase login/anonymous/Google auth                         |
| `/stories`           | Country stories list (dynamic, no SSR)                       |
| `/story?region=&id=` | Single story view (dynamic, no SSR)                          |
| `/settings`          | User account, saved stories, credit purchase                 |

### Auth & Data backends

- **Firebase** — authentication only (client SDK + Admin SDK for server-side token verification). Firebase Storage for story images.
- **MongoDB via Mongoose** — primary data store. Singleton connection in `src/db/mongodb.ts`. Three models: `User`, `MapEntry`, `ProcessedPayment`.

Every protected API route verifies the Firebase Bearer token via `firebaseAdmin.ts` before touching MongoDB.

### LLM & Image Generation

- Story generation endpoint: `POST /api/openai` — calls **Groq** (`llama-3.1-8b-instant`) via raw `fetch`, despite the `openai` npm package being installed.
- Image generation: **Bria AI** (`engine.prod.bria-api.com`).

### Credit System

- `src/lib/credits.ts` — server-only: `getUserCredits`, `deductCredit`, `addCredits`.
- `deductCredit` uses atomic `findOneAndUpdate` with `$gte` guard.
- Basic story = 1 credit, Custom story = 2 credits.
- Payments: **WayForPay** (`src/app/api/wayforpay/`) for UAH and **Stripe** for cards.
- `hooks/useCredits.ts` polls `/api/user/credits` every 8 seconds client-side.

### State Management

No Redux/Zustand. Three layers:

1. **`UserAuthBuilder` context** (`/context/context.tsx`, root-level) — global auth state (`token`, `userId`, `isAuthenticated`).
2. **`AccessibilityContext`** (`src/context/`) — a11y settings persisted to `localStorage`.
3. **Local `useState`** — everything else.

### Styling

- **MUI** (`@mui/material` v6) with custom theme: primary `#7C39EA` (purple).
- **Tailwind CSS** — installed but used sparingly alongside MUI.
- Design tokens in `src/helpers/variables/variables.ts`.

### Path Aliases

`@/*` maps to both `./src/*` and `./` — configured in `tsconfig.json` and `jest.config.ts`.

### Tests

Tests live in `__tests__/`, environment is `node`, preset is `ts-jest`. Firebase SDKs are mocked in `__tests__/setup.ts`.
