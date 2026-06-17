-- =========================================================================
-- Ennie's Hair — Full database schema
-- Paste this entire file into Supabase SQL Editor and click Run.
-- Safe to re-run: every statement uses IF NOT EXISTS / on conflict guards
-- where possible. For a fresh project, just run it once.
-- =========================================================================

-- ---- Roles --------------------------------------------------------------
do $$ begin
  create type public.app_role as enum ('admin', 'customer');
exception when duplicate_object then null; end $$;

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;

drop policy if exists "users read own roles" on public.user_roles;
create policy "users read own roles" on public.user_roles for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "admins read all roles" on public.user_roles;
create policy "admins read all roles" on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "admins manage roles" on public.user_roles;
create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ---- Profiles -----------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  phone text default '',
  location text default '',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "profiles admin read all" on public.profiles;
create policy "profiles admin read all" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update to authenticated using (auth.uid() = id);

-- Auto-create a profile + default 'customer' role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone, location)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'location', '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role) values (new.id, 'customer')
  on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from anon, public, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---- Products -----------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null,
  price numeric not null default 0,
  original_price numeric not null default 0,
  image text not null default '',
  thumbnails text[] not null default '{}',
  stock integer not null default 0,
  length text not null default '',
  texture text not null default '',
  hair_type text not null default '',
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;

drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select to anon, authenticated using (true);
drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ---- Orders -------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  phone text not null default '',
  address text not null default '',
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  status text not null default 'Pending',
  created_at timestamptz not null default now()
);
grant select, insert, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;

drop policy if exists "orders self read" on public.orders;
create policy "orders self read" on public.orders for select to authenticated using (auth.uid() = user_id);
drop policy if exists "orders admin read" on public.orders;
create policy "orders admin read" on public.orders for select to authenticated using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "orders self insert" on public.orders;
create policy "orders self insert" on public.orders for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "orders admin update" on public.orders;
create policy "orders admin update" on public.orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ---- Storage: product images bucket ------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Files themselves are served publicly (bucket is public), but only admins
-- can list/insert/update/delete via the storage.objects table.
drop policy if exists "product images public read" on storage.objects;
drop policy if exists "product images admin list" on storage.objects;
create policy "product images admin list"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "product images admin write" on storage.objects;
create policy "product images admin write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "product images admin update" on storage.objects;
create policy "product images admin update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

drop policy if exists "product images admin delete" on storage.objects;
create policy "product images admin delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- After running:
--   1. Sign up through the app with your email.
--   2. Promote yourself to admin:
--        insert into public.user_roles (user_id, role)
--        select id, 'admin' from auth.users where email = 'you@example.com'
--        on conflict do nothing;
-- =========================================================================
