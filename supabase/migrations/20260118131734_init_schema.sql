-- Enable required extensions (should already exist on Supabase, but safe)
create extension if not exists "pgcrypto";

----------------------------------------------------------------------
-- PROFILES (Auth roles: super_admin, admin)
----------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null check (role in ('super_admin', 'admin')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Helper: check if current auth user is an admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin')
  );
$$;

create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

create policy "profiles_admin_manage"
on public.profiles
for all
using (public.is_admin());

----------------------------------------------------------------------
-- PRODUCTS
----------------------------------------------------------------------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('his', 'hers')),
  subcategory text,
  price numeric(10,2) not null,
  discount_price numeric(10,2),
  sizes text[] default '{}',
  colors text[] default '{}',
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists products_category_idx on public.products(category);
create index if not exists products_active_idx on public.products(active);

alter table public.products enable row level security;

-- Public (storefront) can read active products
create policy "products_public_read_active"
on public.products
for select
using (active = true);

-- Admins can manage everything
create policy "products_admin_all"
on public.products
for all
using (public.is_admin());

----------------------------------------------------------------------
-- INVENTORY (stock per size/color)
----------------------------------------------------------------------

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size text,
  color text,
  quantity integer not null default 0,
  low_stock_threshold integer not null default 5,
  updated_at timestamptz default now()
);

create index if not exists inventory_product_id_idx on public.inventory(product_id);

alter table public.inventory enable row level security;

create policy "inventory_admin_all"
on public.inventory
for all
using (public.is_admin());

----------------------------------------------------------------------
-- PRODUCT IMAGES
----------------------------------------------------------------------

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text not null,
  is_primary boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists product_images_product_id_idx
  on public.product_images(product_id);

alter table public.product_images enable row level security;

-- Public can read images for active products
create policy "product_images_public_read"
on public.product_images
for select
using (
  exists (
    select 1 from public.products p
    where p.id = product_id and p.active = true
  )
);

create policy "product_images_admin_all"
on public.product_images
for all
using (public.is_admin());

----------------------------------------------------------------------
-- BANNERS (His & Hers carousels)
----------------------------------------------------------------------

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('his','hers')),
  image_path text not null,
  headline text,
  subtext text,
  cta_text text,
  cta_link text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists banners_section_idx on public.banners(section);
create index if not exists banners_active_idx on public.banners(active);

alter table public.banners enable row level security;

-- Public can read active banners
create policy "banners_public_read_active"
on public.banners
for select
using (active = true);

create policy "banners_admin_all"
on public.banners
for all
using (public.is_admin());

----------------------------------------------------------------------
-- DELIVERY ZONES
----------------------------------------------------------------------

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  fee numeric(10,2) not null,
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists delivery_zones_name_idx
  on public.delivery_zones(name);
create index if not exists delivery_zones_active_idx
  on public.delivery_zones(active);

alter table public.delivery_zones enable row level security;

create policy "delivery_zones_public_read_active"
on public.delivery_zones
for select
using (active = true);

create policy "delivery_zones_admin_all"
on public.delivery_zones
for all
using (public.is_admin());

----------------------------------------------------------------------
-- ORDERS
----------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users(id),
  customer_name text not null,
  email text not null,
  phone text not null,

  delivery_type text not null check (delivery_type in ('pickup','delivery')),
  delivery_zone_id uuid references public.delivery_zones(id),
  delivery_fee numeric(10,2) not null default 0,
  address_line text,
  house_number text,
  estate_or_road text,

  status text not null default 'Pending'
    check (status in ('Pending','Paid','Preparing','Out for Delivery','Delivered')),

  subtotal_amount numeric(10,2) not null,
  total_amount numeric(10,2) not null,

  payment_reference text,
  created_at timestamptz default now()
);

create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at);
create index if not exists orders_email_idx on public.orders(email);

alter table public.orders enable row level security;

-- Customers can see their own orders (if authenticated)
create policy "orders_customer_read_own"
on public.orders
for select
using (
  auth.uid() is not null
  and customer_id = auth.uid()
);

-- Admins can see & modify all orders
create policy "orders_admin_all"
on public.orders
for all
using (public.is_admin());

----------------------------------------------------------------------
-- ORDER ITEMS
----------------------------------------------------------------------

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  size text,
  color text,
  quantity int not null,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null
);

create index if not exists order_items_order_id_idx
  on public.order_items(order_id);

alter table public.order_items enable row level security;

-- Customer can read items of their own orders
create policy "order_items_customer_read_own"
on public.order_items
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and o.customer_id = auth.uid()
  )
);

create policy "order_items_admin_all"
on public.order_items
for all
using (public.is_admin());

----------------------------------------------------------------------
-- ORDER TRACKING (for future GPS)
----------------------------------------------------------------------

create table if not exists public.order_tracking (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  lat numeric,
  lng numeric,
  recorded_at timestamptz default now()
);

create index if not exists order_tracking_order_id_idx
  on public.order_tracking(order_id);

alter table public.order_tracking enable row level security;

-- Customer can read tracking events for their orders
create policy "order_tracking_customer_read_own"
on public.order_tracking
for select
using (
  exists (
    select 1
    from public.orders o
    where o.id = order_tracking.order_id
      and o.customer_id = auth.uid()
  )
);

create policy "order_tracking_admin_all"
on public.order_tracking
for all
using (public.is_admin());