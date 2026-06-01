
## 1) Forgot password (Supabase)

- Add a "Forgot password?" link on the Login tab of the Welcome dialog.
- New small dialog/view: email input → `supabase.auth.resetPasswordForEmail(email, { redirectTo: ${origin}/reset-password })`.
- New public route `src/routes/reset-password.tsx`: detects the `type=recovery` hash, shows a "new password" form, calls `supabase.auth.updateUser({ password })`, then redirects to login.
- No DB changes. Supabase sends the email via its built-in template.

## 2) EmailJS — admin order notification

- Install `@emailjs/browser`.
- After a successful order insert in `src/lib/store.tsx` (`addOrder`), fire `emailjs.send(...)` to `toyinboayanfedavid@gmail.com`.
- Template variables sent:
  - `customer_name`, `customer_email`, `customer_phone`, `address`
  - `order_id`, `order_total`
  - `items_text` — pre-formatted list like `- Brazilian Body Wave 18" x1 — ₦45,000`
- Keys read from `import.meta.env`:
  - `VITE_EMAILJS_SERVICE_ID`
  - `VITE_EMAILJS_TEMPLATE_ID`
  - `VITE_EMAILJS_PUBLIC_KEY`
- I'll add the 3 keys via the secrets tool so you can paste them in once. If they're missing at runtime, we skip silently (order still succeeds).
- I'll give you the exact EmailJS template body to paste into your EmailJS dashboard.

## 3) Paystack — server-verified checkout

Flow:

```text
Checkout button
  → load Paystack inline JS (https://js.paystack.co/v1/inline.js)
  → PaystackPop.setup({ key: VITE_PAYSTACK_PUBLIC_KEY, email, amount, ref })
  → onSuccess(ref) → call server fn verifyPaystack({ reference })
       → server fetches https://api.paystack.co/transaction/verify/:ref
         with Authorization: Bearer PAYSTACK_SECRET_KEY
       → if status === 'success' AND amount matches → insert order (status='Paid')
       → else → throw, show error toast
```

Files:
- `src/lib/paystack.functions.ts` — `verifyAndPlaceOrder` server fn (uses `requireSupabaseAuth`, reads `process.env.PAYSTACK_SECRET_KEY`, verifies amount + currency, then inserts the order server-side using the authenticated client so RLS still applies).
- Update `src/components/EnniesHair.tsx` checkout to launch Paystack instead of the current "Place Order" insert. Old client-side `addOrder` insert path is removed for the paid flow; EmailJS notification now runs after server verification returns success.
- Secrets requested via add_secret:
  - `VITE_PAYSTACK_PUBLIC_KEY` (pk_test_… / pk_live_…)
  - `PAYSTACK_SECRET_KEY` (sk_test_… / sk_live_…)

Currency: NGN (matches the ₦ pricing already in the app). Amount sent to Paystack is `total * 100` (kobo).

## Order of operations

1. Implement forgot password UI + `/reset-password` route (no secrets needed).
2. Ask you for: EmailJS service id / template id / public key, Paystack public key, Paystack secret key — via the secure secret prompt.
3. Wire EmailJS + Paystack server fn + checkout.
4. Give you the EmailJS template snippet to paste in your EmailJS dashboard.

No database migrations are needed. Existing `orders` table already has all the fields we use; only the `status` value changes from `Pending` to `Paid` on successful verification.
