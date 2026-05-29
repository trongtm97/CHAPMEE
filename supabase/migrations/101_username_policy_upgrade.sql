-- Migration 101: Username policy admin upgrade (enforcement, archive, expanded types)

alter table public.username_policy_rules
  add column if not exists enforcement_level text not null default 'block',
  add column if not exists reason text,
  add column if not exists priority integer not null default 0,
  add column if not exists archived_at timestamptz;

alter table public.username_policy_rules
  drop constraint if exists username_policy_rules_rule_type_check;

alter table public.username_policy_rules
  add constraint username_policy_rules_rule_type_check check (
    rule_type in (
      'banned_username',
      'reserved_username',
      'protected_word',
      'banned_display_name_word',
      'display_name_protected_word',
      'impersonation_risk',
      'brand_reserved',
      'official_only',
      'system_reserved'
    )
  );

alter table public.username_policy_rules
  drop constraint if exists username_policy_rules_match_type_check;

alter table public.username_policy_rules
  add constraint username_policy_rules_match_type_check check (
    match_type in ('exact', 'contains', 'starts_with', 'ends_with', 'regex')
  );

alter table public.username_policy_rules
  drop constraint if exists username_policy_rules_enforcement_level_check;

alter table public.username_policy_rules
  add constraint username_policy_rules_enforcement_level_check check (
    enforcement_level in ('block', 'require_review', 'warn_only')
  );

create index if not exists idx_username_policy_rules_archived
  on public.username_policy_rules (archived_at)
  where archived_at is null;

-- System / brand reserved seeds (skip if normalized value already exists)
insert into public.username_policy_rules (
  rule_type, value, normalized_value, match_type, scope, enforcement_level, note, priority
)
select v.rule_type, v.value, v.normalized_value, v.match_type, v.scope, v.enforcement_level, v.note, v.priority
from (
  values
    ('system_reserved', 'admin', 'admin', 'exact', 'username', 'block', 'Seed: admin', 100),
    ('system_reserved', 'administrator', 'administrator', 'exact', 'username', 'block', 'Seed: administrator', 100),
    ('system_reserved', 'root', 'root', 'exact', 'username', 'block', 'Seed: root', 100),
    ('system_reserved', 'system', 'system', 'exact', 'username', 'block', 'Seed: system', 100),
    ('system_reserved', 'support', 'support', 'exact', 'username', 'block', 'Seed: support', 100),
    ('system_reserved', 'help', 'help', 'exact', 'username', 'block', 'Seed: help', 100),
    ('system_reserved', 'security', 'security', 'exact', 'username', 'block', 'Seed: security', 100),
    ('system_reserved', 'chapmee', 'chapmee', 'exact', 'username', 'block', 'Seed: chapmee', 100),
    ('system_reserved', 'chapmeevn', 'chapmeevn', 'exact', 'username', 'block', 'Seed: chapmeevn', 100),
    ('system_reserved', 'chapmeeofficial', 'chapmeeofficial', 'exact', 'username', 'block', 'Seed: chapmeeofficial', 100),
    ('banned_username', 'verified', 'verified', 'exact', 'username', 'block', 'Seed: verified handle', 90),
    ('official_only', 'official', 'official', 'contains', 'both', 'require_review', 'Seed: official', 80),
    ('official_only', 'chinhthuc', 'chinhthuc', 'contains', 'both', 'require_review', 'Seed: chinh thuc', 80),
    ('official_only', 'chinh-thuc', 'chinhthuc', 'contains', 'both', 'require_review', 'Seed: chinh-thuc', 80),
    ('official_only', 'vietnam', 'vietnam', 'contains', 'both', 'require_review', 'Seed: vietnam', 80),
    ('official_only', 'viet-nam', 'vietnam', 'contains', 'both', 'require_review', 'Seed: viet-nam', 80),
    ('official_only', 'chinhhang', 'chinhhang', 'contains', 'both', 'require_review', 'Seed: chinh hang', 80),
    ('official_only', 'chinh-hang', 'chinhhang', 'contains', 'both', 'require_review', 'Seed: chinh-hang', 80),
    ('impersonation_risk', 'mod', 'mod', 'exact', 'username', 'block', 'Seed: mod', 70),
    ('impersonation_risk', 'moderator', 'moderator', 'contains', 'both', 'block', 'Seed: moderator', 70),
    ('impersonation_risk', 'staff', 'staff', 'contains', 'both', 'block', 'Seed: staff', 70),
    ('impersonation_risk', 'ceo', 'ceo', 'exact', 'username', 'block', 'Seed: ceo', 70),
    ('impersonation_risk', 'founder', 'founder', 'contains', 'username', 'block', 'Seed: founder', 70),
    ('impersonation_risk', 'team', 'team', 'exact', 'username', 'block', 'Seed: team', 70)
) as v(rule_type, value, normalized_value, match_type, scope, enforcement_level, note, priority)
where not exists (
  select 1
  from public.username_policy_rules r
  where r.normalized_value = v.normalized_value
    and r.rule_type = v.rule_type
    and r.archived_at is null
);
