create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  creator_user_id uuid references public.profiles(id) on delete set null,
  transaction_id uuid not null references public.transactions(id) on delete restrict,
  invoice_number text not null unique,
  invoice_type text not null check (invoice_type in ('purchase', 'payout', 'sponsor', 'refund')),
  amount_vnd numeric(18, 2) not null default 0,
  status text not null default 'draft' check (status in ('draft', 'issued', 'cancelled')),
  issued_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index invoices_transaction_idx on public.invoices(transaction_id);
create index invoices_created_at_idx on public.invoices(created_at desc);

alter table public.invoices enable row level security;

create policy "Admin manage invoices"
  on public.invoices for all
  using (public.is_admin_or_founder(auth.uid()))
  with check (public.is_admin_or_founder(auth.uid()));
