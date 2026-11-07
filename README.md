# University Basketball Club — portfolio site

A one-page, editorial-style portfolio for a university basketball club: club intro,
roster, trophy room, activities gallery and a join/contact section.

**Stack:** Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript
**Build:** fully static (`output: "export"`) → deploys anywhere as plain files.
**Theme:** "Hardwood Editorial" — warm paper background, ink type, burnt orange accent
(`#C2410C`), gold secondary (`#EEC166`) used for horizontal rules, highlights and tinted
shades, Fraunces display serif + Manrope body.

**Design system:** two font families and one shared type scale (10 steps), with every
spacing value on an 8px grid. `npm run check:design` enforces both in CI.

---

## Run it locally

```bash
npm install
npm run dev        # → http://localhost:3000
```

Other scripts:

```bash
npm run build        # static build into ./out
npm run preview      # serve the production build (npx serve out)
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

## Editing the content

All copy lives in plain JSON — no code changes needed. Edit these files and the site updates:

| File | What it controls |
| --- | --- |
| `content/club.json` | Club name, university, founded year, hero headline/intro, stats, training times, about text, facilities, facts, milestones, contact details |
| `content/members.json` | `players` (number, name, position, year, height, hometown, bio) and `staff` |
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

## Deploying

The build output is plain HTML/CSS/JS in `out/`, so there is no server to configure.

### Netlify
`netlify.toml` is already set up — connect the repo, or run `npx netlify deploy --prod`:

```toml
[build]
  command = "npm run build"
  publish = "out"
```

### Vercel
Import the repo; `vercel.json` pins the static output:

```json
{ "buildCommand": "npm run build", "outputDirectory": "out" }
```

### GitHub Pages / any static host
Run `npm run build` and upload the contents of `out/`.

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
  about.tsx           # club story, facilities, milestones
  roster.tsx          # player cards + staff
  achievements.tsx    # honours timeline + summary card
  activities.tsx      # gallery grid + upcoming events
  contact.tsx         # join section wrapper
  join-form.tsx       # application form → opens email (client)
  photo.tsx           # <Photo> with court-line placeholder fallback
  reveal.tsx          # scroll-in animation (client, respects reduced motion)
  section-heading.tsx # numbered editorial section header
content/              # ← edit your content here (JSON)
lib/
  content.ts          # typed content loaders + helpers
  cn.ts               # class name helper
public/photos/        # ← drop real photos here
theme-preview/        # design mockups generated during the theme selection
```

## Notes

- Accessibility: skip link, semantic landmarks, labelled sections, keyboard-friendly nav,
  `prefers-reduced-motion` support.
- The join form has no backend: it opens the visitor's email client with a pre-filled
  application addressed to the club email. Point it at a form service
  (Formspree, Netlify Forms) if you want submissions collected automatically.
- Placeholder content is clearly sample data — names, results and dates are fictional.
