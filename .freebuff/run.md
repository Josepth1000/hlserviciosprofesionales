# Run doc — HL Servicios Profesionales (Astro + Keystatic)

## Reproducing the artifacts

- Install dependencies: `npm install` (project uses npm; `package-lock.json` present). `node_modules` already exists in this checkout.
- Environment: **no `.env` required for development.** The panel (`/keystatic`) works in local mode with `admin` / `admin` when `ADMIN_PASSWORD` is not set (localhost only). Optional: copy `.env.example` to `.env` and set `ADMIN_PASSWORD` to test the password-protected login.
- Content: `src/content/**` YAML/Markdown files are checked in; the Astro content store is generated on first run (`.astro/data-store.json`). `npm run dev` / `npm run build` clear it automatically (predev/prebuild scripts) and dev uses polling watchers, so content edits are picked up live and no manual cache deletion is ever needed.

## Running the server

```sh
npm run dev        # site at http://localhost:4321 — panel at http://localhost:4321/keystatic
```

- Default port **4321** (Astro default). If busy, pass `--port <free-port>` or set env.
- Static build: `npm run build` → `dist/`; preview with `npm run preview`.
- Typecheck: `npx astro check`.
