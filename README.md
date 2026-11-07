# University Basketball Club — portfolio site

A one-page, editorial-style portfolio for a university basketball club: club intro,
roster, trophy room, activities gallery and a join/contact section.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript · MongoDB
**Runtime:** Node server (Vercel / Netlify serverless) — required by the join-form API.
**Theme:** "Hardwood Editorial" — warm paper background, ink type, burnt orange accent
(`#C2410C`), gold secondary (`#EEC166`) used for horizontal rules, highlights and tinted
shades, Fraunces display serif + Manrope body.

**Design system:** two font families and one shared type scale (10 steps), with every
spacing value on an 8px grid. `npm run check:design` enforces both in CI.

**Join form:** submissions are validated server-side, stored in MongoDB (Atlas), rate
limited to 3 per email + 10 per IP per 24h, and protected against NoSQL injection and
bot spam. See [Join form backend](#join-form-backend).

---

## Run it locally

```bash
npm install
cp .env.example .env.local   # then fill MONGODB_URI + IP_HASH_SALT
npm run dev                  # → http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build (server output in .next)
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm run check:design # verify the 8px grid + type scale (CI-friendly)
```

> `next build` skips its in-build type validation (`typescript.ignoreBuildErrors`) and uses
> in-process worker threads — this keeps builds fast and working in restricted environments.
> Run `npm run typecheck` in CI or before deploying if you want the type gate.

---

## Design system

### Colour

| Token | Value | Role |
| --- | --- | --- |
| `--color-accent` | `#C2410C` | burnt orange — editorial labels, eyebrows, emphasis text, focus rings |
| `--color-secondary` | `#EEC166` | gold — horizontal rules, marker highlights, role chips, tinted panels |
| `--color-secondary-wash` | `#F8ECD2` | pale gold for shaded sections / cards |
| `--color-ink` | `#17140F` | primary text and dark panels |

Gold is used as a **font colour for emphasis** — never as a filled highlight behind text.
`#EEC166` only has enough contrast on dark surfaces, so on cream the same hue is darkened
to `--color-secondary-ink` (`#8A651A`) for roles and emphasised words; rules and tinted
panels keep `#EEC166` at 30–60% opacity.

`--color-secondary` in `app/globals.css` changes every gold element at once.

### Type — two families, one ladder

All type comes from `Fraunces` (display) and `Manrope` (text), exposed as semantic
classes in `app/globals.css`. Never use Tailwind `text-*` size utilities in components.

| Class | Size | Use |
| --- | --- | --- |
| `type-display` | clamp 48 → 96 px | hero headline only |
| `type-h2` | clamp 32 → 56 px | section titles |
| `type-h3` | 24 px | sub-section headings |
| `type-h4` | 20 px | card titles, list titles |
| `type-numeral` | 32 px | years, milestone numbers |
| `type-stat` | 40 px | big stat figures |
| `type-lead` | 18 px | intros / lead paragraphs |
| `type-body` | 16 px | body copy |
| `type-small` | 14 px | supporting copy, meta, links |
| `type-label` | 12 px | eyebrows, labels, chips, nav |

### Spacing — 8px grid

Every padding, margin, gap, inset and offset is a multiple of 8px. With Tailwind's
default 4px unit that means **even spacing steps only**: `2, 4, 6, 8, 10, 12, 16, 20, 24, 32`
(= 8 → 128px). Section rhythm is `py-24 md:py-32` (96 / 128px), heading-to-content is
`mt-16` (64px), card grids use `gap-8` (32px). No arbitrary `[Npx]` spacing values.

`npm run check:design` scans `app/` and `components/` and fails on any of these
violations, so the system can't silently drift.

---

## Roster filters

The team section has a men/women switch and a filter drop-down. Filters are defined in
`components/roster-board.tsx` and read these JSON fields:

| Filter | Rule |
| --- | --- |
| Elite starters | everyone whose `role` is Captain, Ex-captain or Starter (12 per squad) |
| Most active | top 5 by `monthlySessions` |
| Rising stars | `risingStar: true` and `year` is Freshman/Sophomore |
| Fresh hoopers | `joined` equals `club.currentSeason` |
| Achievers | `awards` is not empty |

Featured players (the carousel above the grid) are the ones with `"featured": true`.

## Editing the content

All copy lives in plain JSON — no code changes needed. Edit these files and the site updates:

| File | What it controls |
| --- | --- |
| `content/club.json` | Club name, university, founded year, current season, hero headline/intro, stats, training times, committee position cards, about text, facilities, facts, milestones, contact details |
| `content/members.json` | `rosters` (men + women, 24 players each: captain, ex-captains, starters and members — `featured` players appear in the carousel) and `staff`. Filter fields: `monthlySessions`, `risingStar`, `joined`, `awards` |
| `content/hall-of-fame.json` | `retiredJerseys` (number, name, years, note) and `inductees` (name, years, position, jersey number, retired flag, impact, quote, induction year) |
| `content/achievements.json` | `summary` stats and the honours `items` (year, title, competition, result, note) |
| `content/activities.json` | Gallery items (title, category, date, description, image) and `upcoming` events |

### Things to replace first

1. **Club identity** — `content/club.json`: change `name`, `shortName`, `university`,
   `founded`, `email`, `instagram`, `homeCourt`, `address`.
2. **Hero headline** — `hero.headline` is an array of lines: `["ON THE", "HARDWOOD."]`.
3. **Roster** — swap the placeholder players in `content/members.json`.
4. **Honours** — replace the sample seasons in `content/achievements.json`.

> Gold emphasis: `hero.introHighlight` in `content/club.json` names a phrase inside
> `hero.intro` that renders in the gold emphasis colour. Change or remove it to move the
> emphasis — other emphasised words are `text-secondary-ink` spans in the components.

---

## Adding real photos

Photos are optional everywhere — when an item has no `image`, the site draws a designed
court-line placeholder instead, so the layout always looks finished.

1. Put image files in `public/photos/` (e.g. `public/photos/team.jpg`).
2. Point to them from the JSON with a root-relative path:

```jsonc
// content/members.json → one player
{
  "number": 4,
  "name": "Avery Rivera",
  "position": "Point Guard",
  // ...
  "image": "/photos/avery-rivera.jpg"
}

// content/activities.json → one gallery item
{
  "title": "Season opener at Main Campus Gym",
  "category": "Game day",
  "date": "October 2025",
  "description": "...",
  "image": "/photos/season-opener.jpg",
  "featured": true
}
```

Use landscape (~4:3 or 16:10) images for the gallery and portrait (~4:5) images for players.
Keep files under ~500 KB each (compress with Squoosh or `cwebp`) for fast loading.

---

## Join form backend

`POST /api/join` (Node runtime) — the browser form is only a convenience layer; every
submission is re-validated on the server.

### Request lifecycle

1. **Origin check** — browser POSTs whose `Origin` host differs from `Host` are rejected (CSRF).
2. **Content type / size** — JSON only; bodies over 10 KB are rejected.
3. **Honeypot** — a hidden `website` field; filled means bot: respond `201`, store nothing.
4. **Schema validation** (zod, `.strict()`) — unknown keys are rejected, so Mongo operator
   keys (`$where`, `$gt`) and dotted paths never reach the driver.
5. **Rate limiting** — atomic MongoDB counters: **3 accepted applications per email** and
   **10 per IP**, in a rolling 24h window (hashed keys, TTL cleanup).
6. **Insert** into the `applications` collection and return `201`.

### Validation rules

| Field | Rule |
| --- | --- |
| `name` | 2–80 chars, unicode letters + spaces, apostrophes, dots, hyphens only |
| `email` | trimmed + lowercased, RFC-style pattern, ≤254 chars |
| `phone` | international format after removing spaces/dashes/parentheses: `+` + 7–15 digits |
| `position` / `year` | must be one of the shared option lists in `lib/form-options.ts` |
| `message` | optional, ≤1,200 chars, normalized, control chars removed, HTML tags rejected |
| `consent` | must be `true` |

Errors return `422` with a `fields` map (friendly messages only, no internals). Rate-limit
responses are `429` with `Retry-After`. Storage failures return a generic `503`.

### Data & privacy

- Stored: name, email, phone, position, year, message, consent, `status: "new"`,
  `source`, user-agent (truncated), salted **HMAC hash** of the IP (never the raw IP),
  and `createdAt`.
- `join_rate_limits` stores only hashed counters and expires via a TTL index.
- For real production use, add a privacy notice/retention policy and restrict Atlas
  network access to your deployment provider.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas / self-hosted connection string |
| `MONGODB_DB` | database name (default `bball_club`) |
| `IP_HASH_SALT` | long random secret for hashing IPs (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |

Copy `.env.example` → `.env.local` and fill the values. Never commit `.env.local`.

### Testing it

```bash
npm run build && npm start -- -p 3100        # or: npm run dev
node --env-file=.env.local scripts/test-mongo.mjs  # connection check
node --env-file=.env.local scripts/test-join.mjs   # 21 validation/security checks
```

The test script covers valid storage, malformed email/phone, operator-injection and
dotted-key bodies, honeypot, the 3-per-email limit, cross-origin denial, oversized bodies,
HTML rejection and the failed-name rules. It cleans up after itself.

### Viewing submissions

Use Atlas Data Explorer or the shell:

```js
db.applications.find({ status: "new" }).sort({ createdAt: -1 })
```

Change rate limits in `lib/rate-limit.ts` (`EMAIL_LIMIT`, `IP_LIMIT`, `WINDOW_MS`).

---

## Deploying

The app now runs on a Node server (API routes + on-demand rendering), so plain static
hosting no longer works. Set the three environment variables in your host's dashboard.

### Vercel
Import the repo — Next.js is auto-detected (`vercel.json` sets the framework). Add the env
vars under *Settings → Environment Variables*, then deploy.

### Netlify
`netlify.toml` uses the official Next.js plugin (`publish = ".next"`). Add the env vars
under *Site settings → Environment variables*.

### Self-hosted
`npm run build && npm start` behind HTTPS (or a reverse proxy). Allow your server's IP in
Atlas, and make sure the proxy forwards `X-Forwarded-For` so IP rate limiting works.

---

## Project structure

```
app/
  layout.tsx          # fonts, metadata, nav + footer shell
  page.tsx            # assembles the one-page layout
  globals.css         # design tokens (colors, type, reveal animation)
  icon.svg            # favicon
components/
  site-nav.tsx        # sticky nav + mobile menu (client)
  hero.tsx            # hero, court line art, stat card, rotating badge
  ticker.tsx          # infinite stats ticker
  about.tsx           # club story, facilities, facts, committee position cards
  roster.tsx          # team section: heading, roster board, staff
  roster-board.tsx    # men/women switch, filter drop-down, carousel + 2-col grid
  featured-carousel.tsx # horizontal carousel of featured players
  featured-card.tsx   # portrait card used in the carousel
  player-row.tsx      # compact scannable row used in the roster grid
  hall-of-fame.tsx    # dark Hall of Fame section + retired jersey banners
  hall-of-fame-carousel.tsx # inductees slider
  achievements.tsx    # honours timeline + summary card
  activities.tsx      # gallery grid + upcoming events
  contact.tsx         # join section wrapper
  join-form.tsx       # application form → POST /api/join (client)
  photo.tsx           # <Photo> with court-line placeholder fallback
  reveal.tsx          # scroll-in animation (client, respects reduced motion)
  section-heading.tsx # numbered editorial section header
app/api/join/route.ts # POST endpoint: validation, rate limiting, MongoDB insert
content/              # ← edit your content here (JSON)
lib/
  content.ts          # typed content loaders + helpers
  validation.ts       # zod schema + sanitizers (server-side truth)
  rate-limit.ts       # hashed-key rolling window limits
  mongodb.ts          # cached client + indexes
  env.ts              # lazy env access
  form-options.ts     # shared position/year options
  cn.ts               # class name helper
scripts/
  test-join.mjs       # API security/validation integration tests
  test-mongo.mjs      # MongoDB connectivity check
public/photos/        # ← drop real photos here
theme-preview/        # design mockups generated during the theme selection
```

## Notes

- Accessibility: skip link, semantic landmarks, labelled sections, keyboard-friendly nav,
  `prefers-reduced-motion` support.
- Join form submissions are stored in MongoDB with server-side validation and rate limiting;
  see [Join form backend](#join-form-backend). Configure `MONGODB_URI`, `MONGODB_DB` and
  `IP_HASH_SALT` before deploying.
- Placeholder content is clearly sample data — names, results and dates are fictional.
