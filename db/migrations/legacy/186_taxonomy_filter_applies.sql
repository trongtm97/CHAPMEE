-- Taxonomy filter apply counts for SEO/catalog analytics.

alter table public.taxonomy_daily_metrics
  add column if not exists filter_applies integer not null default 0;

comment on column public.taxonomy_daily_metrics.filter_applies is
  'Number of taxonomy filter apply events on catalog/taxonomy landing for this term.';
