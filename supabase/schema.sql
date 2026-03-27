-- ============================================================
-- Chattr — Supabase SQL Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Profiles (mirrors auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. Conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  name text,
  is_group boolean default false,
  created_at timestamptz default now()
);

-- 3. Conversation members (junction)
create table if not exists public.conversation_members (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  last_read_at timestamptz default now(),
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

-- 4. Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete cascade,
  content text,
  file_url text,
  reply_to_id uuid references public.messages(id),
  created_at timestamptz default now()
);

-- ============================================================
-- Auto-create profile on sign up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Enable Realtime on messages table
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversation_members;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- profiles: anyone can read; only owner can update
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- conversations: only members can see
create policy "Members can view their conversations"
  on public.conversations for select using (
    exists (
      select 1 from public.conversation_members
      where conversation_id = conversations.id
        and user_id = auth.uid()
    )
  );

create policy "Authenticated users can create conversations"
  on public.conversations for insert with check (auth.role() = 'authenticated');

-- conversation_members: members can see peers
create policy "Members can view conversation members"
  on public.conversation_members for select using (
    exists (
      select 1 from public.conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id
        and cm.user_id = auth.uid()
    )
  );

create policy "Authenticated users can insert members"
  on public.conversation_members for insert with check (auth.role() = 'authenticated');

create policy "Users can update own membership"
  on public.conversation_members for update using (user_id = auth.uid());

-- messages: only members of the conversation
create policy "Members can view messages"
  on public.messages for select using (
    exists (
      select 1 from public.conversation_members
      where conversation_id = messages.conversation_id
        and user_id = auth.uid()
    )
  );

create policy "Members can send messages"
  on public.messages for insert with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversation_members
      where conversation_id = messages.conversation_id
        and user_id = auth.uid()
    )
  );

-- ============================================================
-- Storage bucket for file attachments
-- (Run separately in Supabase dashboard > Storage)
-- Create a bucket called: chat-attachments  (public: true)
-- ============================================================
