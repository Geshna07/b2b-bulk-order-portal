# B2B Bulk Order Portal — Ganga Maxx Marketplace

A B2B bulk-order management portal. An Express (Node.js) server serves static HTML
pages and exposes JSON APIs for customers, staff, and admins. Data lives in
Firebase Firestore. An optional Gemini-powered assistant is included.

## Tech stack
- Server: Node.js + Express (`backend/`)
- UI: static HTML/CSS/JS pages served by Express (`frontend/`)
- Database: Firebase Firestore
- AI: Google Gemini SDK (`@google/genai`)

> Note: `src/` + `vite.config.ts` are leftover AI Studio React scaffolding and are
> not part of the running app. The live UI is the HTML under `frontend/pages/`.

## Run locally
```bash
npm install
npm start          # → http://localhost:3000   (health: /health)
# or: npm run dev  (auto-reload via nodemon)
```
On first boot the server seeds Firestore (`firebase/seedDatabase.js`,
`firebase/adminSeed.js`). This re-runs on every restart, so on hosts that restart
often you may want to gate it behind an env flag later.

## Configuration
Client Firebase config is in `firebase-applet-config.json` / `firebase/firebaseConfig.js`
(public by design). Server-side secrets go in a `.env` file (never committed — see
`.env.example`):
```
GEMINI_API_KEY=...
FIREBASE_PROJECT_ID=startup-glass-23kpg
FIREBASE_DATABASE_ID=ai-studio-b2bbulkorderport-a4a0694c-1e99-4e4c-b915-7c9a490b1e92
```
For Firebase **Admin** features (token verification, auth user creation) the host
needs Google credentials — either run on Google Cloud, or set
`GOOGLE_APPLICATION_CREDENTIALS` to a service-account JSON. Without them, Firestore
reads/writes via the client SDK still work; admin-auth steps are skipped.

## Deploy

### Option A — Render (free, recommended)
1. Push this repo to GitHub (see below).
2. On render.com: **New + → Blueprint**, select the repo. It reads `render.yaml`.
3. In the dashboard, set `GEMINI_API_KEY`. Deploy. Live URL is given on finish.

### Option B — Docker (Railway / Fly.io / Cloud Run)
```bash
docker build -t b2b-portal .
docker run -p 3000:3000 --env-file .env b2b-portal
```

### Push to GitHub
```bash
git remote add origin https://github.com/<you>/b2b-bulk-order-portal.git
git branch -M main
git push -u origin main
```

## Pages
- Customer: dashboard, products, place-order, my-orders, quotation
- Staff: sales-admin, salesman, warehouse, delivery, accounts, compliance
- Admin: dashboard
