# BizVyapar

Waitlist webinar app (React + Vite frontend, Express API).

## Project structure

```
bizvyapar/
├── frontend/     # React + Vite
├── backend/      # Express API (local + Render)
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
   (required: `CORS_ORIGIN`, `MONGODB_URI`, `AUTH_JWT_SECRET`).
5. Keep-alive (prevent free-tier sleep):
   - Set GitHub secret `KEEPALIVE_URL=https://pranavone-api.onrender.com/health`  
     (workflow runs every minute), **or**
   - Set Render cron `KEEPALIVE_URL` to the same `/health` URL, **or**
   - Run `KEEPALIVE_URL=... npm run keepalive` on any always-on machine.
6. Verify:
   - `GET /health` → lightweight `{ status: "ok" }`
   - `GET /api/health` → `ready: true` + `database: "mongodb"`

### Connect frontend to Render API

In the frontend host (Vercel or elsewhere), set:

```
VITE_API_BASE_URL=https://pranavone-api.onrender.com
```

Rebuild/redeploy the frontend after changing this.

## Deploy on Vercel (frontend only)

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com) (root directory = repo root).
3. Vercel will use `vercel.json` (`build` → `frontend/dist`, `/api/*` → proxied to the Render API).
4. The API runs only on Render, so backend secrets (`ADMIN_PASSWORD`, `MONGODB_URI`, …) belong in Render, not Vercel.
5. Deploy.

### After deploy

- Site: `https://www.pranavone.in`
- Health (Render API): `https://pranavone-api.onrender.com/api/health`  
  (`https://www.pranavone.in/api/health` proxies to the same server)

### Notes

- All data (users, subscriptions, profiles, registrations, settings) lives in MongoDB (`MONGODB_URI`).
- Visitor analytics (`backend/src/db/analyticsStore.js`) are stubs until a storage backend is implemented.
- Own profile APIs: `GET /api/profile/me`, `GET /api/auth/me` (Bearer access token) — returns **only that user's** data.
- Keep `MONGODB_URI`, `AUTH_JWT_SECRET`, `ADMIN_PASSWORD`, `SUBADMIN_PASSWORD`, `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` **server-only** (no `VITE_` prefix).
- Course admission (home **Admission** button) charges **₹8,000** via Razorpay and appears under TredsDash → **Admissions**.
- `SUBADMIN_USERNAME` / `SUBADMIN_PASSWORD` create a sales-team login that only sees the Sales section of `/tredsdash` (cannot delete leads or payments).
- Free Render services may sleep when idle; first request after sleep can take ~30–60s.
