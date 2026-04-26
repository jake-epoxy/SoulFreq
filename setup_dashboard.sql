-- Create user_sessions table
create table public.user_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  duration_seconds integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.user_sessions enable row level security;

-- Create policies
create policy "Users can view their own sessions"
  on public.user_sessions for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own sessions"
  on public.user_sessions for insert
  with check ( auth.uid() = user_id );
