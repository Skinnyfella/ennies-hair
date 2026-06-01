
## Goals

1. Give you a complete SQL script you can paste into your own Supabase project to recreate the schema (tables, enum, RLS policies, functions, trigger, storage bucket).
2. Make sure every secret (Supabase, EmailJS, Paystack) is read from `.env` so you can paste real values yourself for Vercel/local.

---

## 1) SQL script for your own Supabase

I will write the full schema as a single file at `supabase/schema.sql` so you can open it and copy/paste into the Supabase SQL editor of your own project. It will include, in correct order:

- `app_role` enum (`admin`, `customer`)
- Tables: `profiles`, `user_roles`, `products`, `orders`
- `GRANT`s for `anon` / `authenticated` / `service_role` matching current policies
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on all four
- All RLS policies currently in the DB (exact same names and expressions as shown in `<supabase-tables>`)
- Functions: `public.has_role(uuid, app_role)` and `public.handle_new_user()`
- Trigger on `auth.users` → `handle_new_user()` so new signups auto-create a profile and a `customer` role
- Storage bucket `product-images` (public) + policies for public read + authenticated/admin write

After you run it, you'll need to manually promote your admin user with:
```sql
insert into public.user_roles (user_id, role)
values ('<your-auth-user-uuid>', 'admin');
```
I'll include this as a commented note at the bottom.

I will NOT include any data rows — schema only. Your existing products list lives in `src/lib/products.ts` as the seed fallback; you can re-add real products from the admin UI once running.

---

## 2) `.env` with dummy values for all keys

Currently the Supabase keys exist in `.env`, but EmailJS/Paystack keys are stored in Lovable Cloud secrets only. I will:

- Append placeholder entries to `.env` so every secret the app reads is visible in one place:
  ```
  # EmailJS (client-side)
  VITE_EMAILJS_SERVICE_ID="your_emailjs_service_id"
  VITE_EMAILJS_TEMPLATE_ID="your_emailjs_template_id"
  VITE_EMAILJS_PUBLIC_KEY="your_emailjs_public_key"

  # Paystack
  VITE_PAYSTACK_PUBLIC_KEY="pk_test_xxx"
  PAYSTACK_SECRET_KEY="sk_test_xxx"

  # Supabase service role (server-only, needed for admin client)
  SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
  ```
- Switch `src/lib/payments.functions.ts` and the EmailJS call site in `src/components/EnniesHair.tsx` to read from `import.meta.env.VITE_*` for the public/browser keys and keep `process.env.PAYSTACK_SECRET_KEY` for the server-only Paystack verify call.
- That way, on Vercel you just set the same variable names in Project → Settings → Environment Variables and everything works without changing code.

### Technical detail
- Public/browser keys must use the `VITE_` prefix because Vite only exposes those to the client bundle.
- `PAYSTACK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` stay un-prefixed since they're only read in server functions (`process.env`).
- I'll keep the existing `?? ""` fallbacks so the build never crashes when a key is empty — Paystack/EmailJS will simply no-op with a clear console warning until you fill in real keys.

---

## Files that will change

- New: `supabase/schema.sql`
- Edit: `.env` (append the 6 new placeholder lines)
- Edit: `src/lib/payments.functions.ts` (read EmailJS + Paystack public key from `import.meta.env` on the client config helper is no longer needed — simpler to read directly in components)
- Edit: `src/components/EnniesHair.tsx` (read EmailJS/Paystack public keys from `import.meta.env.VITE_*` directly instead of fetching `getPublicConfig`)

No DB migration is run against the Lovable Cloud project — this is purely a code + docs change.
