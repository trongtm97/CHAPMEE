alter table public.stories
  add column if not exists content_origin text not null default 'original',
  add column if not exists translation_type text,
  add column if not exists rights_status text not null default 'unverified',
  add column if not exists monetization_policy text not null default 'full',
  add column if not exists original_language text,
  add column if not exists translated_language text,
  add column if not exists source_title text,
  add column if not exists source_author_name text,
  add column if not exists source_url text,
  add column if not exists source_platform text,
  add column if not exists translator_profile_id uuid,
  add column if not exists license_note text,
  add column if not exists license_document_media_id uuid,
  add column if not exists rights_verified_by_admin_id uuid,
  add column if not exists rights_verified_at timestamptz,
  add column if not exists rights_expires_at timestamptz,
  add column if not exists rights_review_note text,
  add column if not exists must_be_free_to_read boolean not null default false,
  add column if not exists can_sell_chapters boolean not null default true,
  add column if not exists can_sell_story_bundle boolean not null default true,
  add column if not exists can_receive_tips boolean not null default true,
  add column if not exists can_share_ads_revenue boolean not null default true,
  add column if not exists can_join_boost_campaign boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stories_content_origin_chk'
  ) then
    alter table public.stories
      add constraint stories_content_origin_chk
      check (content_origin in ('original', 'translation'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'stories_translation_type_chk'
  ) then
    alter table public.stories
      add constraint stories_translation_type_chk
      check (
        translation_type is null
        or translation_type in (
          'official_license',
          'creator_authorized',
          'public_domain',
          'creative_commons',
          'fan_translation',
          'unknown'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'stories_rights_status_chk'
  ) then
    alter table public.stories
      add constraint stories_rights_status_chk
      check (
        rights_status in ('verified', 'pending_review', 'unverified', 'rejected', 'expired')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'stories_monetization_policy_chk'
  ) then
    alter table public.stories
      add constraint stories_monetization_policy_chk
      check (
        monetization_policy in ('full', 'free_only', 'ads_tips_allowed', 'no_monetization')
      );
  end if;
end $$;

update public.stories
set
  must_be_free_to_read = true,
  can_sell_chapters = false,
  can_sell_story_bundle = false,
  can_receive_tips = false,
  can_share_ads_revenue = false,
  can_join_boost_campaign = false
where content_origin = 'translation'
  and rights_status in ('unverified', 'pending_review', 'rejected', 'expired');

do $$
begin
  if to_regclass('public.app_settings') is not null then
    insert into public.app_settings (
      key,
      value,
      is_public
    )
    values (
      'content_origin_policy_settings',
      jsonb_build_object(
        'translation_paid_chapters_allowed', false,
        'translation_story_bundle_allowed', false,
        'translation_coin_unlock_allowed', false,
        'translation_ads_requires_verified_rights', true,
        'translation_tips_requires_verified_rights', true,
        'translation_boost_requires_verified_rights', false,
        'original_full_monetization_enabled', true
      ),
      false
    )
    on conflict (key) do nothing;
  end if;
end $$;

