# WanderWise — Personalized Travel Itinerary Planner

React + Vite + Tailwind · FastAPI · Supabase (Auth + Postgres) · Groq (Llama)

```
wanderwise/
├── backend/   main.py schemas.py itinerary.py requirements.txt Procfile .env.example
├── frontend/  package.json vite/tailwind config, vercel.json, .env.example, src/
│              src/App.jsx  src/lib/{api,supabase}.js  src/components/{Auth,Dashboard,TripForm,TripView}.jsx
└── database/  schema.sql
```

## Modes
| Config | Behavior |
|---|---|
| Groq key set | AI itineraries, badge **AI-generated** |
| No Groq key / Groq error | Template itinerary, badge **Demo-generated, not AI** + notice |
| Supabase set (both ends) | Email/password auth, trips in Postgres (RLS), generate endpoint requires login |
| No Supabase | **No login.** Trips saved only in browser localStorage. Planner fully usable. |

## 1. Supabase (skip for pure demo mode)
1. Create project → SQL Editor → run `database/schema.sql`.
2. Authentication → Providers → Email enabled. For fast demos: turn **Confirm email** off.
3. Project Settings → API: copy URL, publishable/anon key (frontend), service-role/secret key (backend only).

## 2. Run locally
**Backend**
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env     # fill GROQ_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (all optional)
uvicorn main:app --reload --port 8000
```
Check: http://localhost:8000/api/health → shows `ai_configured`, `auth_configured`.

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env     # VITE_API_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev              # http://localhost:5173
```

## 3. Deploy
**Backend → Render** (or Railway/Fly): New Web Service from repo, root dir `backend`.
- Build: `pip install -r requirements.txt`
- Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Env: `GROQ_API_KEY`, `GROQ_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FRONTEND_ORIGINS=https://<your-app>.vercel.app`
- Optional for Vercel previews: `ALLOW_ORIGIN_REGEX=https://.*\.vercel\.app`

**Frontend → Vercel**
```bash
npm i -g vercel
cd frontend
vercel            # framework: Vite, build: npm run build, output: dist
vercel env add VITE_API_URL production            # https://<backend-host>
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_ANON_KEY production  # anon/publishable ONLY
vercel --prod
```
Then set the Vercel URL in the backend `FRONTEND_ORIGINS` and redeploy. In Supabase → Auth → URL Configuration, set Site URL to the Vercel URL.

## API
`GET /api/health` · `POST /api/itinerary/generate` · `GET|POST /api/trips` · `GET|PUT|DELETE /api/trips/{id}` (Bearer = Supabase access token)

## Security notes
- Groq key and Supabase service-role key exist only in `backend/.env`. Frontend gets only the anon key.
- Backend verifies each JWT via Supabase and scopes every query by `user_id`; RLS is enabled as a second layer.
- If Groq retires the default model, set `GROQ_MODEL` to a current Llama model from console.groq.com/docs/models.
