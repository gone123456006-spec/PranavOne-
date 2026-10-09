# BizVyapar

Waitlist webinar app (React + Vite frontend, Express API).

## Project structure

```
bizvyapar/
├── api/          # Vercel serverless entry (Express)
├── frontend/     # React + Vite
├── backend/      # Express API (local + shared with Vercel)
├── vercel.json
└── package.json
```

## Local setup

```bash
npm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
# fill in real values in both .env files
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:5000/api  
- Health: http://localhost:5000/api/health  

Frontend `/api` is proxied to the backend in development.

## Production build (local check)

```bash
npm run build
npm run preview
```

## Deploy backend on Render (recommended for API)

1. Push this repo to GitHub.
2. In [Render](https://render.com) → **New** → **Blueprint** (uses [`render.yaml`](./render.yaml))  
   **or** **Web Service** with:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
3. Create a MongoDB database and set `MONGODB_URI` (and optionally `MONGODB_DB`).
4. Add env vars from [`backend/.env.example`](./backend/.env.example)  
   (required: `CORS_ORIGIN`, `MONGODB_URI`, `AUTH_JWT_SECRET`, `WEBINAR_LINK`, SMTP).
5. Keep-alive (prevent free-tier sleep):
   - Set GitHub secret `KEEPALIVE_URL=https://YOUR-SERVICE.onrender.com/health`  
     (workflow runs every minute), **or**
   - Set Render cron `KEEPALIVE_URL` to the same `/health` URL, **or**
   - Run `KEEPALIVE_URL=... npm run keepalive` on any always-on machine.
6. Verify:
   - `GET /health` → lightweight `{ status: "ok" }`
   - `GET /api/health` → `ready: true` + `database: "mongodb"`

### Connect frontend to Render API

In the frontend host (Vercel or elsewhere), set:

```
VITE_API_BASE_URL=https://YOUR-SERVICE.onrender.com
```

Rebuild/redeploy the frontend after changing this.

## Deploy on Vercel (frontend + optional combined API)

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com) (root directory = repo root).
3. Vercel will use `vercel.json` (`build` → `frontend/dist`, `/api` → Express).
4. Add all variables from [`.env.example`](./.env.example) in  
   **Project → Settings → Environment Variables** (Production + Preview).
5. If API is on Render, set `VITE_API_BASE_URL` to the Render URL and you can skip backend env on Vercel.
6. If API stays on Vercel, set `CORS_ORIGIN` to your live URL.
7. Deploy.

### After deploy

- Site: `https://your-app.vercel.app`
- Health (Vercel API): `https://your-app.vercel.app/api/health`
- Health (Render API): `https://YOUR-SERVICE.onrender.com/api/health`

### Notes

- All data (users, subscriptions, profiles, registrations, settings) lives in MongoDB (`MONGODB_URI`).
- Visitor analytics (`backend/src/db/analyticsStore.js`) are stubs until a storage backend is implemented.
- Own profile APIs: `GET /api/profile/me`, `GET /api/auth/me` (Bearer access token) — returns **only that user's** data.
- Keep `MONGODB_URI`, `AUTH_JWT_SECRET` and the SMTP password **server-only** (no `VITE_` prefix).
- Free Render services may sleep when idle; first request after sleep can take ~30–60s.
