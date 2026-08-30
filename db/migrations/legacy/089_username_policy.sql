-- Migration 089: Username / display name policy rules and change history

create table if not exists public.username_policy_rules (
  id uuid primary key default gen_random_uuid(),
  rule_type text not null,
  value text not null,
  normalized_value text not null,
  match_type text not null default 'exact',
  scope text not null default 'both',
  is_active boolean not null default true,
  allowed_user_ids uuid[] default '{}'::uuid[],
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint username_policy_rules_rule_type_check check (
    rule_type in (
      'banned_username',
      'reserved_username',
      'protected_word',
      'banned_display_name_word'
    )
  ),
  constraint username_policy_rules_match_type_check check (
    match_type in ('exact', 'contains', 'starts_with', 'regex')
  ),
  constraint username_policy_rules_scope_check check (
    scope in ('username', 'display_name', 'both')
  )
);

create index if not exists idx_username_policy_rules_active_type
  on public.username_policy_rules (rule_type, is_active)
  where is_active = true;

create index if not exists idx_username_policy_rules_normalized
  on public.username_policy_rules (normalized_value);

create table if not exists public.username_change_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  old_username text,
  new_username text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  change_reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_username_change_history_user_created
  on public.username_change_history (user_id, created_at desc);

create or replace function public.touch_username_policy_rules_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists username_policy_rules_updated_at on public.username_policy_rules;
create trigger username_policy_rules_updated_at
  before update on public.username_policy_rules
  for each row
  execute function public.touch_username_policy_rules_updated_at();

alter table public.username_policy_rules enable row level security;
alter table public.username_change_history enable row level security;

drop policy if exists "Anyone can read active username policy rules" on public.username_policy_rules;
create policy "Anyone can read active username policy rules"
  on public.username_policy_rules for select
  to authenticated, anon
  using (is_active = true or public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()));

drop policy if exists "Staff manage username policy rules" on public.username_policy_rules;
create policy "Staff manage username policy rules"
  on public.username_policy_rules for all
  to authenticated
  using (public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()))
  with check (public.can_assign_roles(auth.uid()) or public.is_staff_moderator(auth.uid()));

drop policy if exists "Users read own username history" on public.username_change_history;
create policy "Users read own username history"
  on public.username_change_history for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.can_assign_roles(auth.uid())
    or public.is_staff_moderator(auth.uid())
  );

drop policy if exists "Users insert own username history" on public.username_change_history;
create policy "Users insert own username history"
  on public.username_change_history for insert
  to authenticated
  with check (user_id = auth.uid() or public.can_assign_roles(auth.uid()));

-- Default protected / banned words (contains match, both scopes)
insert into public.username_policy_rules (rule_type, value, normalized_value, match_type, scope, note)
values
  ('protected_word', 'official', 'official', 'contains', 'both', 'Seed: official'),
  ('protected_word', 'admin', 'admin', 'contains', 'both', 'Seed: admin'),
  ('protected_word', 'support', 'support', 'contains', 'both', 'Seed: support'),
  ('protected_word', 'moderator', 'moderator', 'contains', 'both', 'Seed: moderator'),
  ('protected_word', 'staff', 'staff', 'contains', 'both', 'Seed: staff'),
  ('protected_word', 'verified', 'verified', 'contains', 'both', 'Seed: verified'),
  ('protected_word', 'chapmee', 'chapmee', 'contains', 'both', 'Seed: chapmee'),
  ('protected_word', 'chapmeestudio', 'chapmeestudio', 'contains', 'both', 'Seed: chapmeestudio'),
  ('protected_word', 'chapme', 'chapme', 'contains', 'both', 'Seed: chapme'),
  ('protected_word', 'chính thức', 'chinhthuc', 'contains', 'both', 'Seed: chinh thuc'),
  ('protected_word', 'chính hãng', 'chinhhang', 'contains', 'both', 'Seed: chinh hang'),
  ('protected_word', 'việt nam', 'vietnam', 'contains', 'both', 'Seed: viet nam'),
  ('protected_word', 'vietnam', 'vietnam', 'contains', 'both', 'Seed: vietnam'),
  ('protected_word', 'hỗ trợ', 'hotro', 'contains', 'both', 'Seed: ho tro'),
  ('protected_word', 'quản trị viên', 'quantrivien', 'contains', 'both', 'Seed: quan tri vien'),
  ('protected_word', 'quản trị', 'quantri', 'contains', 'both', 'Seed: quan tri'),
  ('protected_word', 'mod', 'mod', 'contains', 'both', 'Seed: mod'),
  ('protected_word', 'kiểm duyệt', 'kiemduyet', 'contains', 'both', 'Seed: kiem duyet'),
  ('protected_word', 'tác giả chính thức', 'tacgiachinhthuc', 'contains', 'both', 'Seed: tac gia chinh thuc'),
  ('protected_word', 'ban quản trị', 'banquantri', 'contains', 'both', 'Seed: ban quan tri');
