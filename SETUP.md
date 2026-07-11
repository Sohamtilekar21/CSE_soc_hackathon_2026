# FastAPI + Supabase + Next.js image classification starter

Auth is fully wired up (Supabase email/password, JWT verified on the FastAPI
side). Image classification is a **placeholder** — `backend/app/models/classifier.py`
just returns a fake label so you can test the full flow before plugging in a real model.

## 1. Supabase

1. Create a project at supabase.com.
2. Create a storage bucket called `images` (Storage → New bucket).
3. Run this in the SQL editor:

```sql
create table public.classifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  image_path text not null,
  label text,
  confidence float,
  created_at timestamp with time zone default now()
);

alter table public.classifications enable row level security;

create policy "Users can view their own classifications"
  on public.classifications for select
  using (auth.uid() = user_id);

create policy "Users can insert their own classifications"
  on public.classifications for insert
  with check (auth.uid() = user_id);
```

4. Grab these from Project Settings → API:
   - Project URL
   - `anon` public key
   - `service_role` secret key
   - JWT Secret (under JWT Settings)

## 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then fill in your Supabase values
uvicorn main:app --reload
```

API runs at `http://localhost:8000`. Check `http://localhost:8000/health`.

Endpoints:
- `POST /auth/signup` - email/password signup (optional; frontend can also call Supabase directly)
- `POST /auth/login` - email/password login
- `GET /auth/me` - returns the current user from the JWT
- `POST /classify` - upload an image (requires `Authorization: Bearer <token>`)
- `GET /classify/history` - list past classifications for the current user

## 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm run dev
```

Runs at `http://localhost:3000`. Sign up, log in, and upload an image from
`/dashboard` — it'll hit FastAPI, get a placeholder label back, and store
the image + result in Supabase.

## 4. Wiring up a real model

Everything (auth, storage, DB writes, frontend upload UI) already works.
To add a real classifier, edit only:

```
backend/app/models/classifier.py
```

Replace `run_inference()` with your model loading + inference code (see
the docstring in that file for a PyTorch/torchvision example). Nothing
else needs to change.

## Notes

- The frontend uses the Supabase `anon` key directly for sign up/log in
  (simplest path). The `backend/app/routers/auth.py` endpoints are there
  if you'd rather proxy auth through FastAPI instead.
- FastAPI uses the `service_role` key server-side only — never expose
  that key to the frontend.
- CORS origins are controlled via `CORS_ORIGINS` in `backend/.env`.
