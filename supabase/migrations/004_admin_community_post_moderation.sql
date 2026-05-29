create policy "Moderators can update community posts"
on public.community_posts for update
using (public.current_profile_role() in ('admin', 'moderator'))
with check (public.current_profile_role() in ('admin', 'moderator'));
