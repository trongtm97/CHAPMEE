-- Migration 169: SEO governance fields on taxonomy_terms

alter table public.taxonomy_terms
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_h1 text,
  add column if not exists seo_intro text,
  add column if not exists canonical_path text,
  add column if not exists seo_indexable boolean not null default true,
  add column if not exists sitemap_priority numeric,
  add column if not exists sitemap_changefreq text,
  add column if not exists og_image_url text,
  add column if not exists use_for_pinterest_feed boolean not null default false,
  add column if not exists min_stories_override integer;

comment on column public.taxonomy_terms.seo_indexable is 'When false, landing is noindex even if use_for_seo is true.';
comment on column public.taxonomy_terms.canonical_path is 'Override canonical pathname (e.g. /the-loai/ngon-tinh).';
comment on column public.taxonomy_terms.min_stories_override is 'Admin override for min published stories threshold (null = use platform default).';
comment on column public.taxonomy_terms.use_for_pinterest_feed is 'Include term landing in Pinterest XML feed when eligible.';

create index if not exists idx_taxonomy_terms_seo_sitemap
  on public.taxonomy_terms(type, is_active, is_public, use_for_seo, seo_indexable)
  where is_active = true and is_public = true;
