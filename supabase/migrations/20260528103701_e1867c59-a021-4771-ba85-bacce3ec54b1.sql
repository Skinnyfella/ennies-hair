
revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.handle_new_user() from anon, public, authenticated;

-- Tighten storage listing: keep individual files publicly readable (bucket is public)
-- but only admins can list/select via the table.
drop policy if exists "product images public read" on storage.objects;
create policy "product images admin list"
  on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and public.has_role(auth.uid(), 'admin'));
