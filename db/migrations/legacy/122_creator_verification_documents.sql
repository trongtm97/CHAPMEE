-- Migration 122: Creator verification documents (private storage + audit)

alter table public.account_verifications
  drop constraint if exists account_verifications_status_check;

alter table public.account_verifications
  add constraint account_verifications_status_check check (
    status in (
      'none',
      'pending',
      'approved',
      'rejected',
      'revoked',
      'needs_more_info',
      'expired',
      'cancelled'
    )
  );

alter table public.account_verifications
  drop constraint if exists account_verifications_type_check;

alter table public.account_verifications
  add constraint account_verifications_type_check check (
    verification_type in (
      'identity_verified',
      'notable_author',
      'official_account',
      'partner',
      'brand_account',
      'author_verified',
      'blue_tick',
      'organization',
      'admin_manual',
      'official_creator',
      'payout_individual',
      'organization_brand',
      'ip_owner',
      'appeal_reverification'
    )
  );

create table if not exists public.account_verification_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.account_verifications(id) on delete cascade,
  upload_session_id uuid,
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null,
  file_path text not null,
  original_file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null,
  status text not null default 'uploaded',
  created_at timestamptz not null default now(),
  constraint account_verification_documents_status_check check (
    status in ('uploaded', 'deleted', 'error')
  )
);

create index if not exists idx_account_verification_documents_request_id
  on public.account_verification_documents (request_id);

create index if not exists idx_account_verification_documents_session
  on public.account_verification_documents (upload_session_id, user_id)
  where request_id is null;

create index if not exists idx_account_verification_documents_user_id
  on public.account_verification_documents (user_id, created_at desc);

alter table public.account_verification_documents enable row level security;

drop policy if exists "Users read own verification documents" on public.account_verification_documents;
create policy "Users read own verification documents"
  on public.account_verification_documents for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_assign_roles(auth.uid())
    or public.is_staff_moderator(auth.uid())
  );

drop policy if exists "Users insert own verification documents" on public.account_verification_documents;
create policy "Users insert own verification documents"
  on public.account_verification_documents for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users update own verification documents" on public.account_verification_documents;
create policy "Users update own verification documents"
  on public.account_verification_documents for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Staff manage verification documents" on public.account_verification_documents;
create policy "Staff manage verification documents"
  on public.account_verification_documents for all
  to authenticated
  using (public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()))
  with check (public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()));

create table if not exists public.account_verification_audit_logs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.account_verifications(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_role text not null default 'user',
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_account_verification_audit_logs_request
  on public.account_verification_audit_logs (request_id, created_at desc);

alter table public.account_verification_audit_logs enable row level security;

drop policy if exists "Users read own verification audit logs" on public.account_verification_audit_logs;
create policy "Users read own verification audit logs"
  on public.account_verification_audit_logs for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_assign_roles(auth.uid())
    or public.is_staff_moderator(auth.uid())
  );

drop policy if exists "Authenticated insert verification audit logs" on public.account_verification_audit_logs;
create policy "Authenticated insert verification audit logs"
  on public.account_verification_audit_logs for insert
  to authenticated
  with check (
    actor_id = auth.uid()
    or public.can_assign_roles(auth.uid())
    or public.is_staff_moderator(auth.uid())
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'creator-verification-documents',
  'creator-verification-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users upload own verification documents storage" on storage.objects;
create policy "Users upload own verification documents storage"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'creator-verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users read own verification documents storage" on storage.objects;
create policy "Users read own verification documents storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'creator-verification-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.can_assign_roles(auth.uid())
      or public.is_staff_moderator(auth.uid())
    )
  );

drop policy if exists "Staff read verification documents storage" on storage.objects;
create policy "Staff read verification documents storage"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'creator-verification-documents'
    and (public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()))
  );

drop policy if exists "Users delete own verification documents storage" on storage.objects;
create policy "Users delete own verification documents storage"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'creator-verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create or replace function public.sync_profile_verification_cache(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text;
  v_label text;
begin
  select av.verification_type, av.public_label
  into v_type, v_label
  from public.account_verifications av
  where av.user_id = p_user_id
    and av.status = 'approved'
    and av.display_badge = true
  order by
    case av.verification_type
      when 'official_account' then 1
      when 'official_creator' then 2
      when 'partner' then 3
      when 'blue_tick' then 4
      when 'author_verified' then 5
      when 'organization_brand' then 6
      when 'organization' then 7
      when 'notable_author' then 8
      when 'brand_account' then 9
      when 'admin_manual' then 10
      when 'identity_verified' then 11
      when 'payout_individual' then 12
      else 13
    end,
    av.reviewed_at desc nulls last
  limit 1;

  update public.profiles
  set
    is_verified = v_type is not null,
    verification_type = v_type,
    verification_label = nullif(trim(v_label), ''),
    updated_at = now()
  where id = p_user_id;
end;
$$;
