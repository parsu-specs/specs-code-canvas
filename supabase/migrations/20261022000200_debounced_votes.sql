-- Disable project vote throttling while retaining its implementation and history.
-- Apply after migration_spam_votes.sql and migration_counters.sql.
-- To re-enable, replace this function with SELECT true and enable the UI flag.
create or replace function vote_rate_limit_enabled()
returns boolean language sql immutable as $$ select false $$;
create or replace function check_vote_spam()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_until timestamptz;
  v_secs int;
  v_n int;
  v_ts timestamptz[];
  v_run int := 1;
  v_gap numeric;
  i int;
begin
  if v_uid is null then
    raise exception 'Sign in to vote.';
  end if;
  if not vote_rate_limit_enabled() then return 'ok'; end if;
  -- Hygiene: drop expired pauses so the table stays tiny.
  delete from vote_timeouts where until <= now();
  -- Already paused: report remaining time, no new logging. This path writes
  -- nothing, so raising here is rollback-safe.
  select until into v_until from vote_timeouts where actor_id = v_uid;
  if found and v_until > now() then
    v_secs := ceil(extract(epoch from (v_until - now())))::int;
    if v_secs >= 60 then
      raise exception 'Voting is paused for another % minutes. Try again later.', ceil(v_secs / 60.0)::int;
    else
      raise exception 'Voting is paused for another % seconds. Try again later.', v_secs;
    end if;
  end if;
  -- Log this attempt, then judge it with its own history included.
  insert into rate_hits (actor_id, action) values (v_uid, 'vote:toggle');
  -- BURST: 5 toggles within 10 seconds.
  select count(*) into v_n from rate_hits
    where actor_id = v_uid and action = 'vote:toggle'
      and created_at > now() - interval '10 seconds';
  if v_n < 5 then
    -- SUSTAINED: walk the newest-first timestamps, counting the trailing
    -- chain linked by gaps of at most 5 seconds. A longer pause ends it.
    select array_agg(created_at order by created_at desc) into v_ts
      from (select created_at from rate_hits
              where actor_id = v_uid and action = 'vote:toggle'
              order by created_at desc limit 11) s;
    for i in 2..coalesce(array_length(v_ts, 1), 1) loop
      v_gap := extract(epoch from (v_ts[i - 1] - v_ts[i]));
      -- Only 2–5s gaps link the chain: sub-2s is machine-rapid (burst rule
      -- already covers it), over-5s pauses exempt.
      if v_gap < 2 or v_gap > 5 then
        exit;
      end if;
      v_run := v_run + 1;
    end loop;
    if v_run < 10 then
      return 'ok';
    end if;
  end if;
  -- Tripwire fired: persist the pause, then return WITHOUT raising so the
  -- enclosing transaction commits and the row survives the page refresh.
  insert into vote_timeouts (actor_id, until)
    values (v_uid, now() + interval '5 minutes')
    on conflict (actor_id) do update set until = excluded.until;
  return 'tripped';
end;
$$;
create or replace function toggle_app_vote(p_app_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_row apps%rowtype;
  v_liked boolean;
  v_secs int;
begin
  if v_uid is null then
    raise exception 'Sign in to vote.';
  end if;
  if check_vote_spam() = 'tripped' then
    -- Vote rejected, pause committed with this transaction. Report the
    -- unchanged row plus the pause so clients can announce it immediately.
    select * into v_row from apps where id = p_app_id;
    if v_row.id is null then
      raise exception 'Project not found.';
    end if;
    v_liked := exists (select 1 from app_votes where app_id = p_app_id and user_id = v_uid);
    select ceil(extract(epoch from (until - now())))::int into v_secs
      from vote_timeouts where actor_id = v_uid;
    return jsonb_build_object(
      'row', to_jsonb(v_row),
      'liked', v_liked,
      'pause_started', true,
      'paused_seconds', greatest(v_secs, 0)
    );
  end if;
  perform 1 from apps where id = p_app_id for update;
  -- Permit the guarded counter write below for this transaction only
  -- (see the apps_votes_guard trigger in migration_votes_guard.sql).
  perform set_config('app.votes_rpc', 'on', true);
  if exists (select 1 from app_votes where app_id = p_app_id and user_id = v_uid) then
    delete from app_votes where app_id = p_app_id and user_id = v_uid;
    update apps set votes = greatest(0, votes - 1) where id = p_app_id returning * into v_row;
    v_liked := false;
  else
    insert into app_votes (app_id, user_id) values (p_app_id, v_uid);
    update apps set votes = votes + 1 where id = p_app_id returning * into v_row;
    v_liked := true;
  end if;
  if v_row.id is null then
    raise exception 'Project not found.';
  end if;
  return jsonb_build_object(
    'row', to_jsonb(v_row),
    'liked', v_liked,
    'pause_started', false,
    'paused_seconds', 0
  );
end;
$$;
create or replace function vote_timeout_seconds()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_until timestamptz;
begin
  if not vote_rate_limit_enabled() then return 0; end if;
  if v_uid is null then
    return 0;
  end if;
  select until into v_until from vote_timeouts where actor_id = v_uid;
  if not found or v_until <= now() then
    return 0;
  end if;
  return ceil(extract(epoch from (v_until - now())))::int;
end;
$$;
grant execute on function vote_timeout_seconds() to authenticated;
-- An explicit desired state is idempotent, unlike a toggle. Lock the project
-- before reading membership so concurrent calls cannot drift its counter.
create or replace function set_app_vote(p_app_id text, p_liked boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_row apps%rowtype;
  v_liked boolean;
begin
  if v_uid is null then raise exception 'Sign in to vote.'; end if;
  if p_liked is null then raise exception 'Vote state is required.'; end if;
  select * into v_row from apps where id = p_app_id for update;
  if not found then raise exception 'Project not found.'; end if;
  select exists(select 1 from app_votes where app_id = p_app_id and user_id = v_uid)
    into v_liked;
  if v_liked is distinct from p_liked then
    -- The retained toggle owns spam checks and the guarded counter write.
    return toggle_app_vote(p_app_id);
  end if;
  return jsonb_build_object('row', to_jsonb(v_row), 'liked', v_liked);
end;
$$;
revoke all on function set_app_vote(text, boolean) from public;
grant execute on function set_app_vote(text, boolean) to authenticated;
-- Feed upvotes use the same final-state debounce; retain their limiter behind the flag.
create or replace function toggle_milestone_cheer(p_milestone_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_row milestones%rowtype;
  v_liked boolean;
begin
  if v_uid is null then
    raise exception 'Sign in to cheer.';
  end if;
  if vote_rate_limit_enabled() then
    perform check_rate('cheer:toggle', 30, interval '1 minute');
  end if;
  perform 1 from milestones where id = p_milestone_id for update;
  if exists (select 1 from milestone_cheers where milestone_id = p_milestone_id and user_id = v_uid) then
    delete from milestone_cheers where milestone_id = p_milestone_id and user_id = v_uid;
    update milestones set cheers = greatest(0, cheers - 1) where id = p_milestone_id returning * into v_row;
    v_liked := false;
  else
    insert into milestone_cheers (milestone_id, user_id) values (p_milestone_id, v_uid);
    update milestones set cheers = cheers + 1 where id = p_milestone_id returning * into v_row;
    v_liked := true;
  end if;
  if v_row.id is null then
    raise exception 'Update not found.';
  end if;
  return jsonb_build_object('row', to_jsonb(v_row), 'liked', v_liked);
end;
$$;
create or replace function set_milestone_cheer(p_milestone_id text, p_liked boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text := auth.uid()::text;
  v_row milestones%rowtype;
  v_liked boolean;
begin
  if v_uid is null then raise exception 'Sign in to cheer.'; end if;
  if p_liked is null then raise exception 'Vote state is required.'; end if;
  select * into v_row from milestones where id = p_milestone_id for update;
  if not found then raise exception 'Update not found.'; end if;
  select exists(select 1 from milestone_cheers where milestone_id = p_milestone_id and user_id = v_uid)
    into v_liked;
  if v_liked is distinct from p_liked then
    -- The retained toggle owns spam checks and the counter write.
    return toggle_milestone_cheer(p_milestone_id);
  end if;
  return jsonb_build_object('row', to_jsonb(v_row), 'liked', v_liked);
end;
$$;
revoke all on function set_milestone_cheer(text, boolean) from public;
grant execute on function set_milestone_cheer(text, boolean) to authenticated;
