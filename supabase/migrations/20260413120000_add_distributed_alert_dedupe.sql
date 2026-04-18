-- Distributed alert dedupe/cooldown state for multi-instance deployments.

create table if not exists public.alert_rule_events (
  id bigserial primary key,
  rule_id text not null,
  occurred_at timestamptz not null default timezone('utc', now())
);

create index if not exists alert_rule_events_rule_time_idx
  on public.alert_rule_events (rule_id, occurred_at desc);

create table if not exists public.alert_rule_state (
  rule_id text primary key,
  last_alert_at timestamptz,
  last_decision text not null default 'init',
  last_hit_count integer not null default 0,
  sent_count bigint not null default 0,
  suppressed_count bigint not null default 0,
  last_seen_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

revoke all on public.alert_rule_events from anon, authenticated;
revoke all on public.alert_rule_state from anon, authenticated;

create or replace function public.take_alert_decision(
  p_rule_id text,
  p_threshold integer,
  p_window_ms integer,
  p_cooldown_ms integer,
  p_retention_ms integer default 86400000
)
returns table (
  should_alert boolean,
  hit_count integer,
  cooldown_remaining_ms integer,
  decision text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_window interval;
  v_cooldown interval;
  v_retention interval;
  v_state public.alert_rule_state%rowtype;
  v_hits integer;
  v_cooldown_remaining integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'take_alert_decision requires service_role';
  end if;

  if p_rule_id is null or char_length(trim(p_rule_id)) < 3 then
    raise exception 'take_alert_decision requires a valid rule id';
  end if;

  if p_threshold < 1 or p_threshold > 1000 then
    raise exception 'take_alert_decision threshold out of range';
  end if;

  if p_window_ms < 1000 or p_window_ms > 3600000 then
    raise exception 'take_alert_decision window out of range';
  end if;

  if p_cooldown_ms < 1000 or p_cooldown_ms > 3600000 then
    raise exception 'take_alert_decision cooldown out of range';
  end if;

  if p_retention_ms < 60000 or p_retention_ms > 1209600000 then
    raise exception 'take_alert_decision retention out of range';
  end if;

  perform pg_advisory_xact_lock(hashtext('alert:' || p_rule_id));

  v_window := (p_window_ms::text || ' milliseconds')::interval;
  v_cooldown := (p_cooldown_ms::text || ' milliseconds')::interval;
  v_retention := (p_retention_ms::text || ' milliseconds')::interval;

  insert into public.alert_rule_events (rule_id, occurred_at)
  values (p_rule_id, v_now);

  if random() < 0.05 then
    delete from public.alert_rule_events
    where occurred_at < (v_now - v_retention);

    delete from public.alert_rule_state
    where last_seen_at < (v_now - v_retention);
  end if;

  select count(*)::integer
  into v_hits
  from public.alert_rule_events
  where rule_id = p_rule_id
    and occurred_at >= (v_now - v_window);

  select *
  into v_state
  from public.alert_rule_state
  where rule_id = p_rule_id
  for update;

  if not found then
    insert into public.alert_rule_state (rule_id, last_seen_at, updated_at)
    values (p_rule_id, v_now, v_now)
    on conflict (rule_id) do nothing;

    select *
    into v_state
    from public.alert_rule_state
    where rule_id = p_rule_id
    for update;
  end if;

  if v_hits < p_threshold then
    update public.alert_rule_state
    set last_decision = 'suppressed_threshold',
        last_hit_count = v_hits,
        suppressed_count = suppressed_count + 1,
        last_seen_at = v_now,
        updated_at = v_now
    where rule_id = p_rule_id;

    return query select false, v_hits, 0, 'suppressed_threshold';
    return;
  end if;

  if v_state.last_alert_at is not null and (v_state.last_alert_at + v_cooldown) > v_now then
    v_cooldown_remaining := greatest(
      0,
      ceil(extract(epoch from ((v_state.last_alert_at + v_cooldown) - v_now)) * 1000)::integer
    );

    update public.alert_rule_state
    set last_decision = 'suppressed_cooldown',
        last_hit_count = v_hits,
        suppressed_count = suppressed_count + 1,
        last_seen_at = v_now,
        updated_at = v_now
    where rule_id = p_rule_id;

    return query select false, v_hits, v_cooldown_remaining, 'suppressed_cooldown';
    return;
  end if;

  update public.alert_rule_state
  set last_alert_at = v_now,
      last_decision = 'sent',
      last_hit_count = v_hits,
      sent_count = sent_count + 1,
      last_seen_at = v_now,
      updated_at = v_now
  where rule_id = p_rule_id;

  return query select true, v_hits, 0, 'sent';
end;
$$;

revoke all on function public.take_alert_decision(text, integer, integer, integer, integer)
  from anon, authenticated;
grant execute on function public.take_alert_decision(text, integer, integer, integer, integer)
  to service_role;
