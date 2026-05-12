create extension if not exists pgcrypto;

create role web_anon nologin;
create role app_user nologin;
create role service_role nologin bypassrls;
create role authenticator noinherit login password 'authenticator';

grant web_anon to authenticator;
grant app_user to authenticator;
grant service_role to authenticator;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default 'Default',
  created_at timestamptz not null default now()
);

create table if not exists public.holdings (
  id uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  symbol text not null,
  company_name text not null default '',
  price numeric not null default 0 check (price >= 0),
  quantity numeric not null check (quantity > 0),
  invested numeric not null default 0 check (invested >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (portfolio_id, symbol)
);

create index if not exists portfolios_user_id_idx on public.portfolios(user_id);
create index if not exists holdings_portfolio_id_idx on public.holdings(portfolio_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists holdings_set_updated_at on public.holdings;
create trigger holdings_set_updated_at
before update on public.holdings
for each row
execute function public.set_updated_at();

--alter table public.users enable row level security;
--alter table public.portfolios enable row level security;
--alter table public.holdings enable row level security;

create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::json ->> 'sub',
      current_setting('request.jwt.claim.sub', true)
    ),
    ''
  )::uuid;
$$;

drop policy if exists users_own_rows on public.users;
create policy users_own_rows on public.users
for select
to app_user
using (id = public.current_user_id());

drop policy if exists portfolios_own_rows on public.portfolios;
create policy portfolios_own_rows on public.portfolios
for all
to app_user
using (user_id = public.current_user_id())
with check (user_id = public.current_user_id());

drop policy if exists holdings_own_rows on public.holdings;
create policy holdings_own_rows on public.holdings
for all
to app_user
using (
  exists (
    select 1
    from public.portfolios p
    where p.id = holdings.portfolio_id
      and p.user_id = public.current_user_id()
  )
)
with check (
  exists (
    select 1
    from public.portfolios p
    where p.id = holdings.portfolio_id
      and p.user_id = public.current_user_id()
  )
);

grant usage on schema public to web_anon, app_user, service_role;
grant select, insert, update, delete on public.users to service_role;
grant select (id, email, created_at) on public.users to app_user;
grant select, insert, update, delete on public.portfolios to app_user, service_role;
grant select, insert, update, delete on public.holdings to app_user, service_role;
