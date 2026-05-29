-- Sửa RLS creator_drafts khi 072 áp dụng một phần (bảng đã tạo, policy lỗi).

drop policy if exists "Owners read own creator drafts" on public.creator_drafts;
drop policy if exists "Owners insert own creator drafts" on public.creator_drafts;
drop policy if exists "Owners update own creator drafts" on public.creator_drafts;
drop policy if exists "Owners delete own creator drafts" on public.creator_drafts;

drop policy if exists "Owners read own draft versions" on public.creator_draft_versions;
drop policy if exists "Owners insert own draft versions" on public.creator_draft_versions;
drop policy if exists "Owners delete own draft versions" on public.creator_draft_versions;

create policy "Owners read own creator drafts"
on public.creator_drafts for select
using (owner_id = auth.uid());

create policy "Owners insert own creator drafts"
on public.creator_drafts for insert
with check (owner_id = auth.uid());

create policy "Owners update own creator drafts"
on public.creator_drafts for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Owners delete own creator drafts"
on public.creator_drafts for delete
using (owner_id = auth.uid());

create policy "Owners read own draft versions"
on public.creator_draft_versions for select
using (
  exists (
    select 1
    from public.creator_drafts d
    where d.id = creator_draft_versions.draft_id
    and d.owner_id = auth.uid()
  )
);

create policy "Owners insert own draft versions"
on public.creator_draft_versions for insert
with check (
  exists (
    select 1
    from public.creator_drafts d
    where d.id = creator_draft_versions.draft_id
    and d.owner_id = auth.uid()
  )
  and created_by = auth.uid()
);

create policy "Owners delete own draft versions"
on public.creator_draft_versions for delete
using (
  exists (
    select 1
    from public.creator_drafts d
    where d.id = creator_draft_versions.draft_id
    and d.owner_id = auth.uid()
  )
);
