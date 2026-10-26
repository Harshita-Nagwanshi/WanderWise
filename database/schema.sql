-- Run in Supabase: SQL Editor > New query > Run
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  destination text not null,
  origin text not null,
  start_date date not null,
  end_date date not null,
  travelers int not null check (travelers between 1 and 20),
  budget numeric not null check (budget > 0),
  currency text not null default 'INR',
  style text not null check (style in ('budget','balanced','luxury')),
  interests text[] not null default '{}',
  itinerary jsonb,
  source text not null default 'demo' check (source in ('ai','demo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trips_user_created_idx on public.trips (user_id, created_at desc);

alter table public.trips enable row level security;

create policy "own trips select" on public.trips for select using (auth.uid() = user_id);
create policy "own trips insert" on public.trips for insert with check (auth.uid() = user_id);
create policy "own trips update" on public.trips for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own trips delete" on public.trips for delete using (auth.uid() = user_id);
