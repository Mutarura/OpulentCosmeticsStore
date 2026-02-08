-- Create storage buckets for products and banners
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('banner-images', 'banner-images', true)
on conflict (id) do nothing;

-- PRODUCT IMAGES POLICIES

-- Allow public read access to product images
create policy "Public Access Product Images"
on storage.objects for select
using ( bucket_id = 'product-images' );

-- Allow admins to upload product images
create policy "Admin Upload Product Images"
on storage.objects for insert
with check (
  bucket_id = 'product-images'
  and public.is_admin()
);

-- Allow admins to update product images
create policy "Admin Update Product Images"
on storage.objects for update
using (
  bucket_id = 'product-images'
  and public.is_admin()
);

-- Allow admins to delete product images
create policy "Admin Delete Product Images"
on storage.objects for delete
using (
  bucket_id = 'product-images'
  and public.is_admin()
);

-- BANNER IMAGES POLICIES

-- Allow public read access to banner images
create policy "Public Access Banner Images"
on storage.objects for select
using ( bucket_id = 'banner-images' );

-- Allow admins to upload banner images
create policy "Admin Upload Banner Images"
on storage.objects for insert
with check (
  bucket_id = 'banner-images'
  and public.is_admin()
);

-- Allow admins to update banner images
create policy "Admin Update Banner Images"
on storage.objects for update
using (
  bucket_id = 'banner-images'
  and public.is_admin()
);

-- Allow admins to delete banner images
create policy "Admin Delete Banner Images"
on storage.objects for delete
using (
  bucket_id = 'banner-images'
  and public.is_admin()
);
