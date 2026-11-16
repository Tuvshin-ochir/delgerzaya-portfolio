# Delgerzaya — Living Cell portfolio

A portfolio site where a 3D living cell (Three.js) is viewed through a microscope HUD. Every organelle is a section. Everything on the site — names, titles, text, photos, colours — is edited in the admin panel at **`/admin`**. Site and admin live in the same Next.js app.

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000  ·  admin: http://localhost:3000/admin
```

In `npm run dev` the admin password is `delgerzaya` unless `ADMIN_PASSWORD` is set (see `.env.example`).
Production (`npm run build && npm start`) **requires** `ADMIN_PASSWORD` (and preferably `ADMIN_SECRET`).

Content is stored in `./data/*.json`, uploads in `./data/uploads/` (served at `/uploads/*`).
Delete `./data` to reset to the sample content.

## What the admin can do

| Page | Purpose |
|---|---|
| Dashboard | Visitors, drafts, messages, “Getting started” checklist |
| Sections | Rename, drag to reorder, Published ↔ Draft, use/remove spare organelles (Lysosome, Centrosome, Peroxisome) |
| Section editor | Organelle name, menu label, title, telemetry, notebook entries, results chart, photos (upload or pick), tags, contact-form toggle |
| Media library | Upload JPG/PNG/WebP/HEIC/PDF (≤ 15 MB). Photos are auto-rotated, resized to 2400 px and converted to WebP |
| Messages | Contact-form inbox |
| Appearance | 4 colour themes, name/tagline/top-bar words, rotation speed, glow, particles, intro |
| Site settings | Page title & description (SEO), alert email, links, CV PDF |

Drafts are hidden from the public menu and their organelle dims; open `/?preview=1` while signed in to see them.

## Deploy

**Any server with a disk (VPS, Render with disk, Railway volume…)** — local storage works as-is:

```bash
npm ci && npm run build
ADMIN_PASSWORD=… ADMIN_SECRET=… npm start      # keep ./data on persistent storage
```

**Railway** — local storage on a Railway Volume (no Supabase needed):

1. `railway init` (new project) → `railway up` (or connect the GitHub repo).
2. Add a **Volume** to the service, mount path `/data`.
3. Variables: `DATA_DIR=/data`, `ADMIN_PASSWORD=…`, `ADMIN_SECRET=…` (Railway sets `PORT` itself).
4. Settings → Networking → Generate domain (or add a custom domain).

Railway detects Next.js automatically (`npm run build` → `npm start`); `.railwayignore` keeps `design-proposal/` and local data out of the upload.

**Vercel** (read-only file system) — use Supabase for content + files:

1. Create a Supabase project, run `supabase/schema.sql` in the SQL editor.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD`, `ADMIN_SECRET` in Vercel → Settings → Environment variables.
3. Deploy. The app switches to the Supabase driver automatically when both Supabase variables are present.

Optional email alerts for new messages: set `RESEND_API_KEY` (and `RESEND_FROM` with a verified domain), then enter the alert address in Admin → Site settings.

## Code map

- `src/components/site/cellScene.ts` — the Three.js cell (shaders, bloom, orbit/zoom, selection, dimming)
- `src/components/site/CellExperience.tsx` — HUD layout, menu, notebook, lightbox, gestures
- `src/app/(site)/page.tsx` — loads content and renders the site
- `src/app/admin/**` — admin pages, `actions.ts` (all saves), login
- `src/lib/store.ts` — storage drivers (local / Supabase) · `content.ts` — content helpers · `upload.ts` — image processing
- `design-proposal/` — the approved design drafts (PDFs + HTML prototypes), not part of the build
