# Admin Dashboard for ENNIE'S HAIR

Add a hidden admin role on top of the existing mock auth so you can manage the storefront from inside the same site.

## Admin Credentials (mock)

- **Email:** `admin@ennieshair.com`
- **Password:** `EnniesAdmin2026`

These are seeded into the in-memory user store on app load. Clearly marked in `store.tsx` so you can swap them for Firebase Auth + a real `isAdmin` claim later.

## What the admin can do

1. **Dashboard overview** — total products, low-stock count, total orders, total revenue.
2. **Products / Inventory**
   - Table of all products: image, name, category, price, stock, status (In stock / Low / Out).
   - Add new product (name, category, price, original price, stock, length, texture, hair type, description, image URL).
   - Edit any field inline or via modal.
   - Delete product (with confirm).
   - Low-stock highlight (stock ≤ 3 shown in burgundy).
3. **Orders**
   - Every checkout in `OrderModal` now also pushes an order record `{ id, customer, phone, location, items, total, status, createdAt }` into the store.
   - Admin sees a table: order id, customer, items, total, date, status.
   - Status dropdown: Pending → Processing → Shipped → Delivered.
   - Click row to expand full details (items + delivery address).
4. **Customers** — list of signed-up users (name, email, phone, location, # of orders).

## Route & access

- New route `src/routes/admin.tsx` → `/admin`.
- Guarded: if `user?.email !== ADMIN_EMAIL`, redirect to `/` and open the auth modal.
- Admin layout is separate from the storefront — sidebar (Dashboard / Products / Orders / Customers) + top bar with "Back to store" and Sign Out. Matches the burgundy/beige luxury theme.

## Store changes (`src/lib/store.tsx`)

- Seed admin user in `mockUsers` on init.
- Add `isAdmin` derived getter.
- Move `products` from static const into store state so admin edits are reflected on the storefront live.
- Add `orders: Order[]` + `addOrder`, `updateOrderStatus`.
- Add `addProduct`, `updateProduct`, `deleteProduct`.
- Persist products & orders to `localStorage` (mock; replace with Firestore later).

## Files

- **new** `src/routes/admin.tsx` — guard + layout shell with tab state.
- **new** `src/components/admin/AdminDashboard.tsx` — stat cards.
- **new** `src/components/admin/AdminProducts.tsx` — table + add/edit modal.
- **new** `src/components/admin/AdminOrders.tsx` — orders table + status updates.
- **new** `src/components/admin/AdminCustomers.tsx` — customer list.
- **edit** `src/lib/store.tsx` — admin seed, products/orders state, CRUD actions.
- **edit** `src/lib/products.ts` — export seed data; consumers read from store.
- **edit** `src/components/EnniesHair.tsx` — `OrderModal` calls `addOrder`; product grid reads from store; show small "Admin" link in profile modal when `isAdmin`.

## Out of scope

- Real Firebase Auth role rules, image upload to Firebase Storage, analytics charts. All clearly marked TODO so wiring is a single-file change later.
