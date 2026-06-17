# Self-Hosting Guide — Ennie's Hair

This guide gets the app running on your own Supabase project + hosting.

---

## 1. Create your Supabase project

1. Go to https://supabase.com → New Project.
2. Once created, open **SQL Editor** and paste the full schema from
   [`docs/schema.sql`](./docs/schema.sql). Click **Run**.
3. Open **Authentication → Providers**:
   - Enable **Email** (turn OFF "Confirm email" only if you want instant
     sign-in without verification — production should leave it ON).
   - (Optional) Enable **Google** if you want Google sign-in, and add your
     OAuth client ID / secret.
4. Open **Authentication → URL Configuration**:
   - **Site URL**: your production URL (e.g. `https://yourdomain.com`).
   - **Redirect URLs**: add `https://yourdomain.com/**` and
     `http://localhost:8080/**` for local dev.
5. Open **Storage**: confirm the `product-images` bucket exists (the schema
   creates it). It should be marked **Public**.

### Make yourself an admin

After you sign up for the first time through the app, run this in **SQL Editor**
(replace the email):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'you@example.com'
on conflict do nothing;
```

---

## 2. Get your keys

From the Supabase dashboard:

- **Project Settings → API**:
  - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
  - `anon public` key → `SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only — **never** expose)

From Paystack (https://dashboard.paystack.com/#/settings/developers):

- Public key → `PAYSTACK_PUBLIC_KEY`
- Secret key → `PAYSTACK_SECRET_KEY`

From EmailJS (https://dashboard.emailjs.com):

- Service ID → `EMAILJS_SERVICE_ID`
- Template ID → `EMAILJS_TEMPLATE_ID`
- Public key → `EMAILJS_PUBLIC_KEY`

---

## 3. Configure `.env`

Copy `.env.example` to `.env` and fill in every value. **Do not commit `.env`.**

```bash
cp .env.example .env
```

The `VITE_*` variables are exposed to the browser (safe — they are
publishable keys). Everything else is server-only.

---

## 4. Run locally

```bash
bun install
bun run dev
```

Open http://localhost:8080.

---

## 5. Deploy

Any host that runs a Node/edge runtime works (Vercel, Netlify, Cloudflare
Pages with Workers, Render, Fly.io, a VPS with `bun run build && bun run
start`). Make sure **all** env vars from `.env.example` are configured in
your host's dashboard, not just the `VITE_*` ones — the Paystack secret and
service role key live server-side.

---

## Security notes

- The `service_role` key bypasses Row Level Security. Keep it server-only.
- Admin status is checked against the `user_roles` table on every request;
  do not store roles on `profiles`.
- Paystack payments are re-verified server-side against the authoritative
  product price in the DB. Never trust client-supplied prices.
- The 30-minute inactivity auto-logout is enforced client-side; for full
  protection rely on Supabase JWT expiry settings as well.
