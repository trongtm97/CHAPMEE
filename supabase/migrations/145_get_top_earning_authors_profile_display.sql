-- Earning leaderboard RPC: pen_name column returns profile-resolved display name.

create or replace function public.get_top_earning_authors(
  window_start timestamptz default null,
  ranking_limit integer default 20
)
returns table (
  author_id uuid,
  user_id uuid,
  pen_name text,
  avatar_url text,
  gross_revenue bigint,
  supporter_count bigint,
  paid_reader_count bigint,
  revenue_growth numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cp.id as author_id,
    cp.user_id,
    public.resolve_creator_display_name(p.display_name, p.username, cp.pen_name) as pen_name,
    p.avatar_url,
    0::bigint as gross_revenue,
    0::bigint as supporter_count,
    0::bigint as paid_reader_count,
    0::numeric as revenue_growth
  from public.creator_profiles cp
  join public.profiles p on p.id = cp.user_id
  where 1 = 0
  limit greatest(1, least(ranking_limit, 100));
$$;

grant execute on function public.get_top_earning_authors(timestamptz, integer)
  to anon, authenticated;
