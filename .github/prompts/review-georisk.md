# Map Fairy Tales — Repository-Specific Review Overlay

**Extends**: `.github/prompts/review-base.md`

Use the base prompt for structure, output format, deduplication rules, and review philosophy.
This overlay defines all project-specific rules, patterns, and invariants.

---

## Repository Context

- **Purpose**: Interactive world map with AI-generated fairy tales and folk stories from every country. Portfolio/demo project with free engagement-based credit system.
- **Stack**:
  - Frontend: Next.js 14 (App Router), TypeScript, React 18, MUI v6, Tailwind CSS (light usage), `react-simple-maps` (SVG world map)
  - Backend: Next.js API routes (Node.js runtime), MongoDB via Mongoose
  - Auth: Firebase Auth (client SDK + Admin SDK for server-side token verification)
  - AI: Groq (Llama 3.1 8B) for story generation and translation
  - Storage: Firebase Storage for story images
  - Rate limiting: Upstash Redis with in-memory fallback
- **Package manager**: npm
- **Domain**: `mapfairytales.com`

### Architecture

```
src/
  app/
    page.tsx              Interactive SVG world map (MapWorld)
    auth/page.tsx         Firebase login / anonymous / Google auth
    stories/page.tsx      Country stories list (dynamic, no SSR)
    story/page.tsx        Single story view (dynamic, no SSR)
    settings/page.tsx     User account, liked stories, credit system
    api/
      openai/route.ts     Story generation (Groq LLM) — rate limited, credit-gated
      translate/route.ts  Story translation (Groq LLM) — auth + rate limited
      comments/           CRUD for story comments + replies
      maps/[id]/route.ts  GET/PUT/PATCH for map entries (stories per country)
      credits/earn/       Free credit rewards (engagement-based)
      user/               User data, credits, liked stories, visited
      wayforpay/          Payment webhooks (dormant — now free credits only)
      stories/feed/       Public story feed with pagination

  components/
    Story/Story.tsx               Story viewer — likes, ratings, comments, translate
    CountryStories/               Country stories list with inline credit panel
    CreditsPanel/                 Credit balance + earn/claim UI
    CommentsSection/              Comments and replies
    ExploreFeed/                  Paginated public story feed
    MapWorld/                     react-simple-maps SVG world map

  models/
    User.ts               firebaseUid, credits, plan, rewardsClaimed, likedStories
    MapEntry.ts           mapId (country), stories[], info
    Comment.ts            storyId, authorUid, text, replies[]
    ProcessedPayment.ts   WayForPay idempotency (dormant)

  lib/
    credits.ts            getUserCredits, deductCredit, addCredits (atomic MongoDB ops)
    ratelimit.ts          Upstash Redis + in-memory fallback

  db/
    mongodb.ts            Mongoose singleton connection
    firebaseAdmin.ts      Firebase Admin SDK for server-side token verification

  context/
    context.tsx           UserAuthBuilder — global auth state (token, userId, isAuthenticated)

hooks/
  useCredits.ts           Client-side: poll credits, earnCredits(action), buyPackage
```

### Credit System (engagement-based, free)

Users earn credits through engagement actions. No real payments active.

| Action       | Credits | Daily Limit |
|-------------|---------|-------------|
| daily_visit  | +1      | 1/day       |
| share        | +2      | 3/day       |
| like         | +1      | 3/day       |
| comment      | +1      | 2/day       |
| free_pack_10 | +10     | 1/day       |
| free_pack_30 | +30     | 1/day       |
| free_pack_100| +100    | 1/day       |

Story generation costs: basic = 1 credit, custom = 2 credits.

---

## File Type Handling (Extends Base)

**ALSO REVIEW IN DETAIL:**

- `src/app/api/**/*.ts` — auth checks, rate limiting, input validation, atomic DB ops
- `src/components/**/*.tsx` — client/server boundary, hooks usage, auth context
- `src/models/*.ts` — Mongoose schema definitions, indexes
- `src/lib/*.ts` — credit deduction, rate limiting
- `hooks/*.ts` — client-side data fetching, polling

**ALSO SKIP:**

- `.next/` — build artifacts
- `node_modules/` — dependencies
- `public/` — static assets (images, robots.txt, llms.txt)
- `*.lock`, `package-lock.json` — dependency lockfiles
- ShadCN/MUI base components — third-party owned

---

## Project Severity Rules

### 🔴 CRITICAL

| Rule | Why |
|------|-----|
| Missing Firebase auth check on write API route | Any unauthenticated user can modify data |
| Missing ownership check on story/map mutations | Any auth user can modify any other user's stories |
| Client-controlled `viewCount` set (not `$inc`) | Allows arbitrary view inflation — must use server-side increment |
| `likes`/`ratings` object accepted without UID validation | Users can forge likes/ratings for any UID |
| Missing rate limit on LLM-calling endpoint | DDoS/cost abuse — Groq API calls are expensive at scale |
| Hardcoded API keys or Firebase credentials in source | Secrets exposed in git permanently |
| `deductCredit` without atomic `$gte` guard | Double-spend: user can generate stories without sufficient credits |

### 🟠 HIGH

| Rule | Why |
|------|-----|
| Missing rate limit on write endpoint (comments, replies, credits) | Spam vector — can flood DB with unlimited writes |
| Missing `"use client"` on component using hooks/events/browser APIs | Silent SSR failure — component renders as static HTML |
| `react-simple-maps` or heavy component imported without `dynamic()` + `{ ssr: false }` | SSR crash on `window`/`document` access |
| Firebase token not sent with authenticated API call | 401 errors on protected endpoints |
| Missing input validation (text length, field existence) on POST routes | Unbounded input can crash LLM or overflow DB |
| Credit reward without daily limit check | Infinite credit farming by repeating actions |

### 🟡 MEDIUM

| Rule | Why |
|------|-----|
| Missing error handling around `fetch()` calls in components | Silent failures, broken UI on network errors |
| Optimistic UI update without server confirmation rollback | UI shows stale data if server rejects the action |
| `any` type in TypeScript | Bypasses type safety — use `unknown` and narrow |
| Missing `try/catch` around `req.json()` in API routes | Malformed JSON body returns 500 instead of 400 |
| Redis/Upstash call without fallback | Rate limiting fails open when Upstash is unreachable |
| Polling interval too aggressive (< 5s for credits) | Wastes bandwidth and may trigger rate limits |

---

## Mandatory Project Patterns

### 1. Firebase Auth on Write Routes

Every API route that modifies data MUST verify the Firebase ID token.

```typescript
// CORRECT
const uid = await verifyUser(req);
if (!uid)
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// WRONG — no auth check, public write access
export async function POST(req: NextRequest) {
  const body = await req.json();
  await Model.create(body);
}
```

**Check:** Every POST/PUT/PATCH/DELETE handler starts with auth verification.

### 2. Atomic Credit Operations

Credit deduction MUST use MongoDB `findOneAndUpdate` with `$gte` guard.

```typescript
// CORRECT — atomic deduct
const updated = await User.findOneAndUpdate(
  { firebaseUid: userId, credits: { $gte: cost } },
  { $inc: { credits: -cost } },
  { new: true },
).lean();

// WRONG — read then write (race condition)
const user = await User.findOne({ firebaseUid: userId });
if (user.credits >= cost) {
  user.credits -= cost;
  await user.save();
}
```

### 3. Rate Limiting Pattern

Use `checkStoryRateLimit` / `checkCommentRateLimit` from `src/lib/ratelimit.ts`.

```typescript
// CORRECT
const rateLimit = await checkCommentRateLimit(uid);
if (!rateLimit.success)
  return NextResponse.json(
    { error: "Too many requests." },
    { status: 429, headers: { "Retry-After": "60" } },
  );
```

**Check:** All POST routes that trigger DB writes or LLM calls have rate limiting.

### 4. Server-Side View Counting

View counts MUST use `$inc`, never client-controlled values.

```typescript
// CORRECT
body: JSON.stringify({ storyId: id, incrementView: true })

// WRONG
body: JSON.stringify({ storyId: id, viewCount: 99999 })
```

### 5. Likes/Ratings Ownership

Server MUST only accept the authenticated user's own like/rating entry.

```typescript
// CORRECT — only caller's own like
if (body.likes !== undefined && uid) {
  const userLikeValue = body.likes[uid];
  if (typeof userLikeValue === "boolean") {
    setFields[`stories.$[elem].likes.${uid}`] = userLikeValue;
  }
}

// WRONG — accept entire likes object
setFields["stories.$[elem].likes"] = body.likes;
```

### 6. Story Ownership for Privacy

Only the story owner can toggle `isPublic`. Verify via `$elemMatch`.

```typescript
// CORRECT
const owns = await MapEntry.countDocuments({
  mapId: params.id,
  stories: { $elemMatch: { id: body.storyId, userId: uid } },
});
```

### 7. LLM Endpoint Protection

All endpoints calling Groq/LLM API MUST have: (1) auth, (2) rate limit, (3) input sanitization.

### 8. Credit Reward Limits

`earnCredits` actions MUST check daily limits server-side.

```typescript
// CORRECT — server checks rewardsClaimed for today
const todayClaims = user.rewardsClaimed.filter(
  (r) => r.type === action && new Date(r.claimedAt) >= todayStart,
);
if (todayClaims.length >= config.maxPerDay) {
  return NextResponse.json({ error: "Daily limit reached" }, { status: 429 });
}
```

---

## Data Invariants

### MapEntry Model

- `mapId` = country identifier (string, e.g., "Ukraine", "Japan")
- `stories[]` — each story has: `id`, `userId`, `story` (title, paragraphs, imageUrl), `isPublic`, `likes`, `ratings`, `viewCount`
- Stories with `isPublic: false` only visible to author
- Stories without `isPublic` field default to public (backward compat)

### User Model

- `firebaseUid` — unique; `credits` — integer, never negative (`$gte` guard)
- `rewardsClaimed` — `{ type, claimedAt }[]` for daily limit tracking
- `likedStories` — synced from MapEntry.stories likes via PATCH

### Credit Costs

- Basic story: 1 credit, Custom story: 2 credits
- Translation: free (rate-limited only)
- New user starts with 2 credits

---

## Security Checklist

- [ ] All write routes require Firebase token
- [ ] Rate limiting on all POST endpoints (especially LLM)
- [ ] Input validation: text length limits, required fields, JSON parse try/catch
- [ ] Atomic MongoDB operations for credits
- [ ] No hardcoded API keys
- [ ] PATCH only accepts caller's own UID for likes/ratings
- [ ] View count uses `$inc` not client value
- [ ] `isPublic` toggle requires story ownership
- [ ] CSP header present in next.config.mjs

---

## Review Workflow

1. **Scope check** — Identify changed files. Only review those.
2. **Secrets scan** — Any hardcoded credentials? CRITICAL if yes.
3. **Auth check** — Every write route has Firebase token verification?
4. **Rate limit check** — All POST routes rate-limited?
5. **Ownership check** — Mutations verify the caller owns the resource?
6. **Credit safety** — Atomic ops, daily limits enforced server-side?
7. **Input validation** — Length limits, required fields, try/catch on req.json()?
8. **TypeScript types** — No `any`, proper error handling?
9. **SSR safety** — Dynamic imports for browser-only components?
