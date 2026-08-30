-- SEO fields for stories and chapters (episodes)

alter table public.stories
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_keywords text[],
  add column if not exists canonical_url text;

alter table public.episodes
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_keywords text[];
