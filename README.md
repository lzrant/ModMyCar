# ModMyCar

A React 19 + Vite + Three.js car configurator. Choose a year/make/model, select compatible catalog parts, set paint, and save the result to your private garage. The repository root is the frontend; `server/` is the Express API with its own package manifest. One npm workspace install handles both.

## Run locally

Use Node **22.12+ within Node 22 LTS, or Node 24+**. Node 23 is not supported by the test runner.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` to the Express server on port 3001. `npm run dev` starts both processes and stops both on Ctrl+C. Alternatively, run `npm run dev:client` and `npm run dev --workspace server` in separate terminals.

The default `DATA_MODE=local` needs **no credentials**. It reads the curated catalog from `server/catalog.json` and persists builds to ignored `server/data/builds.json`. Writes are serialized and atomic. An HttpOnly browser cookie keeps each local garage separate. Local mode binds to loopback and is for development on one computer; use Supabase for hosted access.

## Environment

Only `.env.example` is tracked; its credential placeholders are empty. Never put secrets in `VITE_*` variables, source files, screenshots, or commit messages.

| Variable            | Purpose                                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DATA_MODE`         | `local` (default) or `supabase`; invalid values fail startup.                                                     |
| `SUPABASE_URL`      | Your Supabase project URL; required only in Supabase mode.                                                        |
| `SUPABASE_ANON_KEY` | Supabase anon/publishable key, stored only on the server; required in Supabase mode. No service-role key is used. |
| `FRONTEND_ORIGIN`   | Exact allowed browser origin, e.g. `http://localhost:5173`, without a trailing slash. HTTPS sets secure cookies.  |
| `PORT`              | Express port; defaults to 3001. Vite reads the same value for its proxy.                                          |
| `VITE_API_BASE_URL` | Frontend API prefix; defaults to `/api`. Prefer a same-origin `/api` reverse proxy in production.                 |

## Supabase setup

1. **Rotate the previously exposed key in the Supabase dashboard before reuse.** Its file has been removed from the working tree and rewritten out of local and remote `master` history. Existing clones, forks, and provider caches are outside this checkout; owners must discard old history, and GitHub Support may be needed for cached sensitive-data references.
2. Run `server/db/schema.sql`, then `server/db/seed.sql` in the Supabase SQL editor.
3. Enable **Authentication → Providers → Anonymous Sign-Ins**. Saved builds use anonymous authenticated users with row-level security. Each browser retains its session through HttpOnly access/refresh cookies; the API refreshes expired sessions. No tokens are returned to frontend JavaScript.
4. Set `DATA_MODE=supabase`, fill the two empty Supabase values in your local `.env`, and restart.
5. In production, serve the frontend and `/api` through the same HTTPS origin, set `FRONTEND_ORIGIN` to that exact origin, and run `npm run build` plus `npm start --workspace server` under your process manager. Serve `dist/` with your web server. `vite preview` alone does not host the API.

Catalog tables are read-only to public clients. Build reads and inserts are limited to `auth.uid()`; anonymous unauthenticated clients cannot access builds. A PostgreSQL trigger validates fitment and one-part-per-slot even for direct Supabase requests. Build snapshots are immutable. Clearing cookies loses access to an anonymous garage; this version does not implement cross-device account login.

The migration preserves existing `parts` and `compatibility` rows. It adds exact `vehicle_id` compatibility and visual metadata rather than interpreting ambiguous legacy year-range text. Legacy fitment rows remain stored but are not offered until an administrator assigns an exact vehicle and supported visual variant. Seeds identify vehicles by year/make/model/trim and parts by SKU, so existing numeric IDs are not overwritten. Re-running schema/seed is supported and tested.

## Data and rendering

```text
Year / make / model
        ↓
GET /api/vehicles/:id/parts[?category=wheels]
        ↓
Selected compatible part IDs + paint color
        ├── POST /api/builds → private saved snapshot → GET /api/builds/:id
        ↓
shared/renderPresets.js (visual_category:render_key → slot, operation, effects, builder)
        ↓
Three.js glTF body + configured wheels/materials/accessories
        └── detailed procedural body when the glTF is unavailable
```

`shared/types.js` documents VehicleProfile, Dimensions, Part, BuildPayload, Build, and OperationIds with JSDoc. `src/lib/propTypes.js` supplies component shapes; API payloads and selections are explicitly validated at runtime. `shared/selection.js` handles slot replacement and secondary name/category/SKU search. Search filters the catalog; it does not infer a build or silently choose a part.

`src/three/` separates body surfaces, canopy/glass, materials, wheel and exhaust parameter functions, aero builders, primitives, glTF normalization, scene/camera/lighting, resource disposal, and assembly. The original dense body/canopy surfaces, extruded silhouettes, trim, mirrors, and lights are preserved. Models load first with a spinner; failures leave a visible fallback message and the detailed procedural car. Changing parts does not reload the glTF or reset the camera. Native wheels are hidden and replaced with configured geometry; suspension moves the chassis while tires remain grounded.

The initial catalog contains **eight real products and six vehicle entries**: 2018/2019 Subaru WRX, Subaru BRZ, and Toyota 86. Each product links to its manufacturer reference and carries fitment notes. Wheel entries are reference fitments that require tire, hub, and brake-clearance checks for the exact trim. The bundled CC0 Kenney vehicles and generated accessories are **representative visualizations, not manufacturer CAD models or physical fitment simulations**. The existing five body profiles remain available for catalog expansion. Original model licenses are in `public/models/kenney-car-kit/`.

CarQuery's legacy HTTPS endpoint failed certificate hostname validation during verification on 2026-09-10. Its standalone JSONP application was retired; the integrated `VehiclePicker` uses the API's catalog, so users can only configure vehicles with explicit fitment data.

To add products: add manufacturer/SKU/source/fitment data to `server/catalog.json`, add exact compatibility pairs, and use a supported `visual_category`/`render_key`. If introducing a visual variant, update `shared/renderPresets.js` and its named builder, then run `node server/db/generateSeed.js`. The generated SQL mirrors the same registry; tests catch divergence. Existing curated records are not overwritten by seeds; manage updates to those records with a reviewed SQL migration.

## API

| Method / path                                       | Result                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `GET /api/health`                                   | Active storage mode and health.                                                  |
| `GET /api/vehicles?year=2018&make=Subaru&model=WRX` | Vehicle records, with optional exact filters.                                    |
| `GET /api/vehicles/:id/parts?category=wheels`       | Only that vehicle's compatible parts, optionally by visual category.             |
| `POST /api/builds`                                  | Save `{ vehicle_id, part_ids, paint_color }`; returns snapshot ID and timestamp. |
| `GET /api/builds`                                   | Current browser user's saved snapshots, newest first.                            |
| `GET /api/builds/:id`                               | Restore an owned snapshot; foreign or missing IDs return 404.                    |

JSON requests are limited to 16 KB. Unknown fields, malformed IDs/colors, duplicates, incompatible selections, and conflicting slots are rejected. CORS allows only `FRONTEND_ORIGIN`; foreign browser origins are also rejected server-side. API failures return safe JSON errors and the UI provides retry controls.

## Verification

```sh
npm run check                 # ESLint + Vitest + production build
npm run test:watch
npx playwright install chromium
npm run test:e2e              # starts frontend/API if needed
```

Vitest exercises matching/selection, canonical build round trips, validation, every render variant, fixed geometry counts/bounds, glTF wheel replacement, HTTP endpoints/CORS, owner isolation, persistence across server restart, and concurrent saves. Embedded PostgreSQL tests run the real migration/seed twice and verify compatibility triggers and row-level policies without Supabase credentials. Playwright covers catalog/paint/save/reload/load, vehicle switching, loading/404 fallback on mobile, and API outage recovery. GitHub Actions runs lint, tests, build and browser tests on pushes and pull requests.
