-- Bật Supabase Realtime cho messaging (RLS vẫn áp dụng trên subscription)

alter table public.messages replica identity full;
alter table public.conversations replica identity full;
alter table public.conversation_participants replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversation_participants;
exception
  when duplicate_object then null;
end $$;
