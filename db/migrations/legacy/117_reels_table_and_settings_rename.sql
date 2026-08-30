-- Phase 4: Reels rename — table, settings, placements, lifecycle segments.

alter table public.swipe_items rename to reels_items;

alter index if exists swipe_items_owner_status_idx rename to reels_items_owner_status_idx;
alter index if exists swipe_items_published_idx rename to reels_items_published_idx;
alter index if exists swipe_items_story_idx rename to reels_items_story_idx;

alter table public.reels_items rename constraint swipe_items_status_check to reels_items_status_check;
alter table public.reels_items rename constraint swipe_items_source_type_check to reels_items_source_type_check;

alter trigger swipe_items_set_updated_at on public.reels_items rename to reels_items_set_updated_at;

drop policy if exists "Owners manage own swipe items" on public.reels_items;
drop policy if exists "Public read published swipe items" on public.reels_items;

create policy "Owners manage own reels items"
on public.reels_items
for all
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Public read published reels items"
on public.reels_items
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.stories s
    where s.id = reels_items.story_id
      and s.status in ('published', 'approved')
      and s.visibility = 'public'
  )
);

update public.monetization_settings
set key = replace(key, 'swipe.', 'reels.')
where key like 'swipe.%'
  and not exists (
    select 1
    from public.monetization_settings ms
    where ms.key = replace(monetization_settings.key, 'swipe.', 'reels.')
  );

update public.monetization_settings
set value = to_jsonb('reels'::text)
where key = 'product.mobile_default_tab'
  and value = to_jsonb('swipe'::text);

update public.monetization_settings
set value = to_jsonb('reels_feed'::text)
where key = 'product.desktop_home_mode'
  and value = to_jsonb('swipe_feed'::text);

update public.brand_campaigns
set placement = 'reels_native_card'
where placement = 'swipe_native_card';

update public.user_lifecycle_states
set current_segments = (
  select coalesce(
    array_agg(
      case
        when segment = 'swipe_viewer_no_follow' then 'reels_viewer_no_follow'
        else segment
      end
    ),
    '{}'::text[]
  )
  from unnest(current_segments) as segment
)
where 'swipe_viewer_no_follow' = any (current_segments);
