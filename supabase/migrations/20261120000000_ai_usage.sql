-- جدول شمارش استفاده از دستیار هوشمند (فقط برای سقف روزانه لازم است)
create table if not exists public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_user_day on public.ai_usage (user_id, kind, created_at desc);

alter table public.ai_usage enable row level security;
create policy "users read own usage" on public.ai_usage for select using (auth.uid() = user_id);
create policy "users insert own usage" on public.ai_usage for insert with check (auth.uid() = user_id);
