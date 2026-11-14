-- Image storage for logos, barber photos and service images.
-- Files are public to view (they appear on the public booking page).
-- Only an admin of a shop can add or change files in that shop's folder:
--   images/<shop id>/<file>

insert into storage.buckets (id, name, public) values ('images', 'images', true)
on conflict (id) do nothing;

create policy images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'images' and public.is_shop_member(((storage.foldername(name))[1])::uuid));
create policy images_update on storage.objects for update to authenticated
  using (bucket_id = 'images' and public.is_shop_member(((storage.foldername(name))[1])::uuid));
create policy images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'images' and public.is_shop_member(((storage.foldername(name))[1])::uuid));
