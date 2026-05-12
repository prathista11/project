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
