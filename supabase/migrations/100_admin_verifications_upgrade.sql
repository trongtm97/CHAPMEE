-- Migration 100: Admin Verification Center upgrade for ChapMee

alter table public.account_verifications
  add column if not exists source text default 'user_request',
  add column if not exists public_note text,
  add column if not exists rejection_reason text,
  add column if not exists needs_more_info_deadline timestamptz;

update public.account_verifications
set source = 'user_request'
where source is null;

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
      'expired'
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
      'admin_manual'
    )
  );

alter table public.account_verifications
  drop constraint if exists account_verifications_source_check;

alter table public.account_verifications
  add constraint account_verifications_source_check check (
    source in (
      'user_request',
      'admin_direct',
      'studio',
      'moderation'
    )
  );

create table if not exists public.verification_notes (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.account_verifications(id) on delete cascade,
  admin_id uuid not null references public.profiles(id),
  note text not null,
  tag text,
  created_at timestamptz not null default now(),
  constraint verification_notes_tag_check check (
    tag is null or tag in ('normal', 'watch', 'partner', 'risk')
  )
);

create index if not exists idx_verification_notes_verification_id
  on public.verification_notes (verification_id, created_at desc);

alter table public.verification_notes enable row level security;

drop policy if exists "Staff manage verification notes" on public.verification_notes;
create policy "Staff manage verification notes"
  on public.verification_notes for all
  to authenticated
  using (public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()))
  with check (public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()));

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
      when 'partner' then 2
      when 'blue_tick' then 3
      when 'author_verified' then 4
      when 'notable_author' then 5
      when 'organization' then 6
      when 'brand_account' then 7
      when 'admin_manual' then 8
      when 'identity_verified' then 9
      else 10
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
