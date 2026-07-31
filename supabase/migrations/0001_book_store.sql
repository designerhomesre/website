-- =============================================================================
-- DESIGNER HOMES — Book store schema
-- Run in Supabase SQL editor (or `supabase db push`).
--
-- Security model: RLS is ENABLED with NO anon/authenticated policies, so the
-- public anon key can read/write NOTHING. All access happens through the
-- Netlify functions using the SERVICE ROLE key (which bypasses RLS). Customers
-- therefore can never read another customer's order, address, or files.
-- =============================================================================

create extension if not exists pgcrypto;

-- Human-readable order number sequence (DH-YYYY-000001)
create sequence if not exists book_order_seq start 1;

create or replace function next_book_order_seq()
returns bigint language sql security definer set search_path = public as $$
  select nextval('book_order_seq');
$$;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists book_orders (
  id                        uuid primary key default gen_random_uuid(),
  order_number              text unique not null,
  customer_name             text,
  customer_email            text,
  customer_phone            text,
  shipping_address          jsonb,
  subtotal_cents            integer not null default 0,
  shipping_cents            integer not null default 0,
  tax_cents                 integer not null default 0,
  discount_cents            integer not null default 0,
  total_cents               integer not null default 0,
  currency                  text default 'usd',
  has_physical              boolean default false,
  has_digital               boolean default false,
  entitlement_ebook         boolean default false,
  entitlement_workbook_pdf  boolean default false,
  -- Stripe
  stripe_session_id         text unique,     -- idempotency key
  stripe_payment_intent     text,
  payment_status            text default 'paid',   -- Paid / Refunded / etc.
  -- Fulfillment
  fulfillment_status        text default 'Awaiting Fulfillment',
  -- Allowed: Paid, Awaiting Fulfillment, Packing, Ready to Ship, Shipped,
  --          Delivered, Canceled, Refunded, Needs Attention
  tracking_number           text,
  tracking_url              text,
  shipping_carrier          text,
  shipping_service          text,
  shipping_label_cost_cents integer,
  packed_date               timestamptz,
  ship_date                 timestamptz,
  shipped_date              timestamptz,
  delivered_date            timestamptz,
  -- Digital / email tracking
  digital_delivery_status   text default 'not_applicable', -- pending/sent/skipped/not_applicable
  digital_delivery_at       timestamptz,
  email_confirmation_status text default 'pending',         -- pending/sent/skipped
  email_confirmation_at     timestamptz,
  -- Admin / status
  admin_notes               text,
  refund_status             text,            -- none / partial / full / canceled
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);
create index if not exists idx_book_orders_created on book_orders (created_at desc);
create index if not exists idx_book_orders_email on book_orders (lower(customer_email));
create index if not exists idx_book_orders_fulfillment on book_orders (fulfillment_status);

-- ---------------------------------------------------------------------------
-- Order line items
-- ---------------------------------------------------------------------------
create table if not exists book_order_items (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references book_orders(id) on delete cascade,
  product_id         text not null,
  sku                text,
  name               text,
  format             text,
  unit_amount_cents  integer not null default 0,
  quantity           integer not null default 1,
  physical           boolean default true,
  created_at         timestamptz default now()
);
create index if not exists idx_book_items_order on book_order_items (order_id);

-- ---------------------------------------------------------------------------
-- Digital download grants (entitlement tokens)
-- ---------------------------------------------------------------------------
create table if not exists book_digital_grants (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references book_orders(id) on delete cascade,
  file_id            text not null,          -- MEMOIR_EBOOK / WORKBOOK_PDF
  token              text not null,          -- HMAC, validated by book-download
  request_count      integer default 0,
  last_requested_at  timestamptz,
  resent_count       integer default 0,
  resent_at          timestamptz,
  created_at         timestamptz default now(),
  unique (order_id, file_id)
);
create index if not exists idx_grants_order on book_digital_grants (order_id);

-- ---------------------------------------------------------------------------
-- Optional inventory (authoritative counts; config holds display defaults)
-- ---------------------------------------------------------------------------
create table if not exists book_inventory (
  product_id  text primary key,
  quantity    integer not null default 0,
  updated_at  timestamptz default now()
);

create or replace function decrement_book_inventory(p_product_id text, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  update book_inventory set quantity = greatest(0, quantity - p_qty), updated_at = now()
  where product_id = p_product_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_book_orders_updated on book_orders;
create trigger trg_book_orders_updated before update on book_orders
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — deny all to anon/authenticated; service role bypasses.
-- ---------------------------------------------------------------------------
alter table book_orders        enable row level security;
alter table book_order_items   enable row level security;
alter table book_digital_grants enable row level security;
alter table book_inventory     enable row level security;
-- (No policies created on purpose: only the service role can access these.)

-- ---------------------------------------------------------------------------
-- Private storage bucket for digital files (e-book + fillable workbook PDF)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('book-digital', 'book-digital', false)
on conflict (id) do nothing;
-- No storage policies => not publicly reachable. The server mints signed URLs
-- with the service key on a per-download, entitlement-checked basis.
