-- Distributed rate limiting primitives backed by Postgres.

create table if not exists public.rate_limits (
  rate_limit_key text primary key,
  count integer not null,
  window_started_at timestamptz not null,
  window_ends_at timestamptz not null,
  blocked_until timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint rate_limits_count_positive check (count > 0),
  constraint rate_limits_window_valid check (window_ends_at > window_started_at)
);

create index if not exists rate_limits_window_ends_idx on public.rate_limits (window_ends_at);
create index if not exists rate_limits_blocked_until_idx on public.rate_limits (blocked_until);

revoke all on public.rate_limits from anon, authenticated;

create or replace function public.take_rate_limit(
  p_key text,
  p_limit integer,
  p_window_ms integer,
  p_block_ms integer default 0
)
returns table (allowed boolean, retry_after_ms integer, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window_interval interval;
  v_block_interval interval;
  v_state public.rate_limits%rowtype;
  v_retry_ms integer;
begin
  if p_key is null or char_length(trim(p_key)) < 3 then
    raise exception 'take_rate_limit requires a valid key';
  end if;

  if p_limit < 1 or p_limit > 10000 then
    raise exception 'take_rate_limit limit out of range';
  end if;

  if p_window_ms < 1000 or p_window_ms > 3600000 then
    raise exception 'take_rate_limit window out of range';
  end if;

  if p_block_ms < 0 or p_block_ms > 86400000 then
    raise exception 'take_rate_limit block out of range';
  end if;

  v_window_interval := (p_window_ms::text || ' milliseconds')::interval;
  v_block_interval := (p_block_ms::text || ' milliseconds')::interval;

  if random() < 0.01 then
    delete from public.rate_limits
    where window_ends_at < (v_now - interval '1 day')
      and (blocked_until is null or blocked_until < (v_now - interval '1 day'));
  end if;

  select *
  into v_state
  from public.rate_limits
  where rate_limit_key = p_key
  for update;

  if found and v_state.blocked_until is not null and v_state.blocked_until > v_now then
    v_retry_ms := greatest(0, ceil(extract(epoch from (v_state.blocked_until - v_now)) * 1000)::integer);
    return query select false, v_retry_ms, 'blocked';
    return;
  end if;

  if not found or v_state.window_ends_at <= v_now then
    insert into public.rate_limits (
      rate_limit_key,
      count,
      window_started_at,
      window_ends_at,
      blocked_until,
      updated_at
    )
    values (
      p_key,
      1,
      v_now,
      v_now + v_window_interval,
      null,
      v_now
    )
    on conflict (rate_limit_key) do update
      set count = excluded.count,
          window_started_at = excluded.window_started_at,
          window_ends_at = excluded.window_ends_at,
          blocked_until = excluded.blocked_until,
          updated_at = excluded.updated_at;

    return query select true, 0, null::text;
    return;
  end if;

  v_state.count := v_state.count + 1;

  if v_state.count > p_limit then
    if p_block_ms > 0 then
      v_state.blocked_until := v_now + v_block_interval;
      v_retry_ms := greatest(0, ceil(extract(epoch from (v_state.blocked_until - v_now)) * 1000)::integer);
    else
      v_state.blocked_until := null;
      v_retry_ms := greatest(0, ceil(extract(epoch from (v_state.window_ends_at - v_now)) * 1000)::integer);
    end if;

    update public.rate_limits
      set count = v_state.count,
          blocked_until = v_state.blocked_until,
          updated_at = v_now
      where rate_limit_key = p_key;

    return query select false, v_retry_ms, case when p_block_ms > 0 then 'blocked' else 'window' end;
    return;
  end if;

  update public.rate_limits
    set count = v_state.count,
        updated_at = v_now
    where rate_limit_key = p_key;

  return query select true, 0, null::text;
end;
$$;

create or replace function public.clear_rate_limit(p_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_key is null or char_length(trim(p_key)) = 0 then
    return;
  end if;

  delete from public.rate_limits where rate_limit_key = p_key;
end;
$$;

grant execute on function public.take_rate_limit(text, integer, integer, integer) to anon, authenticated;
grant execute on function public.clear_rate_limit(text) to anon, authenticated;
