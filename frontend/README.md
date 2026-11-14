# AUBG Olympics frontend

React 19, TypeScript and Vite. Editable application code lives in `src/`; static files live in `public/`. `dist/` is generated output for hosting.

## Development

```sh
npm ci
npm run dev
```

For a local backend, put `VITE_API_BASE_URL=http://localhost:4000` in `.env.development.local`. This variable is public frontend configuration. Never put secrets in `VITE_*` variables.

## Production build and hosting

```sh
npm ci
npm run build
```

`.env.production` records the deployed API address, `https://api.aubgolympics.com`. Vite embeds it at build time. Environment variables or `.env.production.local` can override it intentionally.

Upload the **contents** of `dist/` to the hosting document root, including the hidden `.htaccess` file. The Apache rewrite rules allow direct links such as `/dday/schedule` to load the React app. Keep a backup of the previous deployment before replacing it.

Make future changes in this repository, commit them, and rebuild. Changes made directly to hosted bundles will not flow back into source control. Events, capacity, sponsors and public settings also depend on the separately deployed API/database.

## Recovery verification

```sh
npm run test:recovery
npm run build
node scripts/compare-deployment.mjs /path/to/downloaded/hosting/root
```

The last command requires the preserved hosting snapshot, not a running website. See [RECOVERY.md](RECOVERY.md) for provenance, restored changes and validation limits.
