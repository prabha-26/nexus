create extension if not exists pgcrypto;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

-- USERS
create table if not exists public.users (
  uid uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text not null,
  photo_url text,
  role text not null default 'user',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- POSTS
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_uid uuid not null references public.users(uid) on delete cascade,
  author_name text not null,
  author_photo text,
  content text not null check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists posts_created_at_idx on public.posts (created_at desc);

-- Trigger for users.updated_at
drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

-- Enable RLS
alter table public.users enable row level security;
alter table public.posts enable row level security;

-- USERS policies (profiles)
drop policy if exists "Users can view profiles" on public.users;
create policy "Users can view profiles"
on public.users
for select
to authenticated
using (true);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
on public.users
for insert
to authenticated
with check (auth.uid() = uid);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
on public.users
for update
to authenticated
using (auth.uid() = uid)
with check (auth.uid() = uid);

-- POSTS policies
drop policy if exists "Users can read posts" on public.posts;
create policy "Users can read posts"
on public.posts
for select
to authenticated
using (true);

drop policy if exists "Users can insert own posts" on public.posts;
create policy "Users can insert own posts"
on public.posts
for insert
to authenticated
with check (auth.uid() = author_uid);

-- (Optional but usually needed)
-- Uncomment if you want users to be able to edit/delete their own posts.
-- If you don't want that, keep these out.

-- drop policy if exists "Users can update own posts" on public.posts;
-- create policy "Users can update own posts"
-- on public.posts
-- for update
-- to authenticated
-- using (auth.uid() = author_uid)
-- with check (auth.uid() = author_uid);

-- drop policy if exists "Users can delete own posts" on public.posts;
-- create policy "Users can delete own posts"
-- on public.posts
-- for delete
-- to authenticated
-- using (auth.uid() = author_uid);