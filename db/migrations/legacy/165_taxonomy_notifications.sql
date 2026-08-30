-- Taxonomy request outcome notifications for creators

alter type public.notification_type add value if not exists 'taxonomy_request_approved';
alter type public.notification_type add value if not exists 'taxonomy_request_rejected';
alter type public.notification_type add value if not exists 'taxonomy_request_merged';
