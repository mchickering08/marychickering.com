-- Face Card database. Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Then set the group login with a separate query (see SETUP.md). The password never goes in this file,
-- because this file is in a public repo.
-- Re-running this file resets the ladder, duels and player names (the group login is kept).

-- ---------- clean slate ----------
drop trigger if exists facecard_on_signup on auth.users;
drop function if exists public.facecard_new_user();
drop table if exists public.match_frames cascade;
drop table if exists public.match_players cascade;
drop table if exists public.matches cascade;
drop table if exists public.profiles cascade;
create table if not exists public.group_access (
  id       int primary key default 1 check (id = 1),
  username text not null,
  salt     text not null,
  pw_hash  text not null
);
alter table public.group_access enable row level security; -- no policies: nobody can read it from the site

-- ---------- players ----------
-- A player is a name on the ladder. "owner" is whichever phone/laptop is logged in as that player right now.
create table public.profiles (
  id         uuid primary key default gen_random_uuid(),
  owner      uuid unique references auth.users(id) on delete set null,
  username   text unique not null check (username ~ '^[a-z0-9_]{3,20}$'),
  elo        int  not null default 1000,
  wins       int  not null default 0,
  losses     int  not null default 0,
  best       int  not null default 0,
  xp         int  not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- group login ----------
create or replace function public.fc_hash(p_salt text, p_pass text) returns text
language sql immutable as $$ select encode(sha256(convert_to(p_salt || ':' || p_pass, 'UTF8')), 'hex') $$;

-- run once from the SQL editor: select set_group_login('skincaregroup', 'your password');
create or replace function public.set_group_login(p_user text, p_pass text) returns text
language plpgsql security definer set search_path = public as $$
declare s text := md5(random()::text || clock_timestamp()::text);
begin
  insert into group_access (id, username, salt, pw_hash) values (1, lower(trim(p_user)), s, fc_hash(s, p_pass))
  on conflict (id) do update set username = excluded.username, salt = excluded.salt, pw_hash = excluded.pw_hash;
  return 'group login set for ' || lower(trim(p_user));
end $$;

-- the site calls this after starting a session: checks the group login, then makes or reclaims your player
create or replace function public.join_group(p_user text, p_pass text, p_name text) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); g public.group_access; n text := lower(trim(p_name)); r public.profiles;
begin
  if u is null then raise exception 'log in first'; end if;
  select * into g from group_access where id = 1;
  if not found then raise exception 'the group login has not been set up yet'; end if;
  if lower(trim(p_user)) <> g.username or fc_hash(g.salt, p_pass) <> g.pw_hash then
    perform pg_sleep(0.5);
    raise exception 'wrong username or password';
  end if;
  if n !~ '^[a-z0-9_]{3,20}$' then raise exception 'player names are 3-20 letters, numbers or _'; end if;
  update profiles set owner = null where owner = u and username <> n;   -- switching players on this device
  insert into profiles (owner, username) values (u, n)
  on conflict (username) do update set owner = u                         -- same name on a new device = your stats come back
  returning * into r;
  return r;
end $$;

create or replace function public.fc_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where owner = auth.uid())
$$;

-- ---------- duels ----------
create table public.matches (
  id         uuid primary key default gen_random_uuid(),
  code       text unique not null,
  is_public  boolean not null default false,
  status     text not null default 'waiting' check (status in ('waiting','live','done')),
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  start_at   timestamptz,
  end_at     timestamptz,
  next_code  text
);

create table public.match_players (
  match_id  uuid not null references public.matches(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  score     int check (score between 0 and 100),
  elo_delta int,
  won       boolean,
  primary key (match_id, user_id)
);
create index on public.matches (status, is_public, created_at);

-- ---------- who can read/write ----------
-- Only people who got past the group login can read. Nobody writes tables directly:
-- every change goes through the functions below, which check the rules.
alter table public.profiles      enable row level security;
alter table public.matches       enable row level security;
alter table public.match_players enable row level security;
create policy "read profiles" on public.profiles      for select to authenticated using (public.fc_member());
create policy "read matches"  on public.matches       for select to authenticated using (public.fc_member());
create policy "read players"  on public.match_players for select to authenticated using (public.fc_member());

-- ---------- helpers ----------
create or replace function public.fc_me() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare p uuid;
begin
  select id into p from profiles where owner = auth.uid();
  if p is null then raise exception 'log in first'; end if;
  return p;
end $$;

create or replace function public.fc_code() returns text
language plpgsql as $$
declare a text := 'abcdefghjkmnpqrstuvwxyz23456789'; c text; i int;
begin
  loop
    c := '';
    for i in 1..4 loop c := c || substr(a, 1 + floor(random()*length(a))::int, 1); end loop;
    exit when not exists (select 1 from public.matches where code = c);
  end loop;
  return c;
end $$;

create or replace function public.server_now() returns timestamptz
language sql stable as $$ select now() $$;

-- ---------- scans ----------
create or replace function public.record_scan(p_score int) returns public.profiles
language plpgsql security definer set search_path = public as $$
declare me uuid := fc_me(); r public.profiles;
begin
  update profiles
     set best = greatest(best, least(100, greatest(0, coalesce(p_score,0)))),
         xp   = xp + 50
   where id = me returning * into r;
  return r;
end $$;

-- ---------- making and joining duels ----------
create or replace function public.create_match(p_public boolean default false) returns public.matches
language plpgsql security definer set search_path = public as $$
declare me uuid := fc_me(); m public.matches;
begin
  insert into matches (code, is_public, created_by) values (fc_code(), p_public, me) returning * into m;
  insert into match_players (match_id, user_id) values (m.id, me);
  return m;
end $$;

create or replace function public.quick_match() returns public.matches
language plpgsql security definer set search_path = public as $$
declare me uuid := fc_me(); m public.matches;
begin
  -- already waiting in a public lobby? stay there
  select x.* into m from matches x join match_players p on p.match_id = x.id
   where p.user_id = me and x.is_public and x.status = 'waiting'
     and x.created_at > now() - interval '10 minutes'
   order by x.created_at desc limit 1;
  if found then return m; end if;

  select x.* into m from matches x
   where x.is_public and x.status = 'waiting'
     and x.created_at > now() - interval '10 minutes'
     and (select count(*) from match_players p where p.match_id = x.id) < 6
   order by x.created_at limit 1
   for update skip locked;
  if not found then return create_match(true); end if;

  insert into match_players (match_id, user_id) values (m.id, me) on conflict do nothing;
  return m;
end $$;

create or replace function public.join_match(p_code text) returns public.matches
language plpgsql security definer set search_path = public as $$
declare me uuid := fc_me(); m public.matches; hops int := 0;
begin
  select * into m from matches where code = lower(trim(p_code)) for update;
  -- a finished duel with a rematch forwards you to the rematch
  while found and m.status = 'done' and m.next_code is not null and hops < 5 loop
    select * into m from matches where code = m.next_code for update;
    hops := hops + 1;
  end loop;
  if not found then raise exception 'no duel with that code'; end if;
  if exists (select 1 from match_players where match_id = m.id and user_id = me) then return m; end if;
  if m.status <> 'waiting' then raise exception 'that duel already started'; end if;
  if (select count(*) from match_players where match_id = m.id) >= 6 then raise exception 'that duel is full'; end if;
  insert into match_players (match_id, user_id) values (m.id, me);
  return m;
end $$;

create or replace function public.leave_match(p_match uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := fc_me(); m public.matches;
begin
  select * into m from matches where id = p_match for update;
  if not found or m.status <> 'waiting' then return; end if;  -- leaving a live duel counts as a no-show
  delete from match_players where match_id = p_match and user_id = me;
  if not exists (select 1 from match_players where match_id = p_match) then
    delete from matches where id = p_match;
  end if;
end $$;

-- ---------- playing a round ----------
create or replace function public.start_match(p_match uuid) returns public.matches
language plpgsql security definer set search_path = public as $$
declare me uuid := fc_me(); m public.matches;
begin
  select * into m from matches where id = p_match for update;
  if not found then raise exception 'no such duel'; end if;
  if not exists (select 1 from match_players where match_id = m.id and user_id = me) then raise exception 'you are not in this duel'; end if;
  if m.status <> 'waiting' then return m; end if;
  if (select count(*) from match_players where match_id = m.id) < 2 then raise exception 'need at least 2 players'; end if;
  update matches set status = 'live',
         start_at = now() + interval '3 seconds',
         end_at   = now() + interval '33 seconds'
   where id = m.id returning * into m;
  return m;
end $$;

create or replace function public.finish_match(p_match uuid) returns public.matches
language plpgsql security definer set search_path = public as $$
declare
  m public.matches; p record; o record;
  n int; done_n int; best_score int; k numeric; delta numeric; e numeric; s numeric;
begin
  select * into m from matches where id = p_match for update;
  if not found or m.status <> 'live' then return m; end if;
  select count(*), count(score), max(score) into n, done_n, best_score from match_players where match_id = m.id;
  if done_n < n and now() < m.end_at + interval '3 seconds' then return m; end if;

  if done_n >= 2 then
    k := 32.0 / greatest(1, n - 1);
    for p in select mp.user_id, mp.score, pr.elo from match_players mp join profiles pr on pr.id = mp.user_id where mp.match_id = m.id loop
      delta := 0;
      for o in select mp.user_id, mp.score, pr.elo from match_players mp join profiles pr on pr.id = mp.user_id
                where mp.match_id = m.id and mp.user_id <> p.user_id loop
        e := 1.0 / (1.0 + power(10.0, (o.elo - p.elo) / 400.0));
        s := case when p.score is null then 0
                  when o.score is null then 1
                  when p.score > o.score then 1
                  when p.score = o.score then 0.5
                  else 0 end;
        delta := delta + k * (s - e);
      end loop;
      update match_players set elo_delta = round(delta), won = (p.score is not null and p.score = best_score)
       where match_id = m.id and user_id = p.user_id;
    end loop;
    update profiles pr
       set elo    = pr.elo + mp.elo_delta,
           wins   = pr.wins   + case when mp.won then 1 else 0 end,
           losses = pr.losses + case when mp.won then 0 else 1 end,
           best   = greatest(pr.best, coalesce(mp.score, 0)),
           xp     = pr.xp + case when mp.won then 100 when mp.score is not null then 25 else 0 end
      from match_players mp
     where mp.match_id = m.id and mp.user_id = pr.id;
  else
    update match_players set elo_delta = 0, won = false where match_id = m.id;
  end if;

  update matches set status = 'done' where id = m.id returning * into m;
  return m;
end $$;

create or replace function public.submit_score(p_match uuid, p_score int) returns public.matches
language plpgsql security definer set search_path = public as $$
declare me uuid := fc_me(); m public.matches;
begin
  select * into m from matches where id = p_match;
  if not found then raise exception 'no such duel'; end if;
  if m.status <> 'live' then raise exception 'the round is not running'; end if;
  if now() < m.start_at then raise exception 'wait for the countdown'; end if;
  if now() > m.end_at + interval '2 seconds' then raise exception 'too late, time ran out'; end if;
  update match_players set score = least(100, greatest(0, p_score))
   where match_id = m.id and user_id = me and score is null;
  if not found then raise exception 'you already locked in, or you are not in this duel'; end if;
  return finish_match(m.id);
end $$;

create or replace function public.rematch(p_match uuid) returns public.matches
language plpgsql security definer set search_path = public as $$
declare me uuid := fc_me(); m public.matches; r public.matches;
begin
  select * into m from matches where id = p_match for update;
  if not found or m.status <> 'done' then raise exception 'that duel is not finished'; end if;
  if m.next_code is not null then return join_match(m.next_code); end if;
  r := create_match(m.is_public);
  update matches set next_code = r.code where id = m.id;
  return r;
end $$;

-- ---------- permissions ----------
revoke all on function public.set_group_login(text,text) from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on function public.record_scan(int), public.create_match(boolean), public.quick_match(),
  public.join_match(text), public.leave_match(uuid), public.start_match(uuid), public.finish_match(uuid),
  public.submit_score(uuid,int), public.rematch(uuid), public.server_now(),
  public.join_group(text,text,text), public.fc_member() to authenticated;

-- ---------- duel face snapshots (backup route) ----------

create table if not exists public.match_frames (
  match_id   uuid not null references public.matches(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  img        text not null,
  score      int,
  flags      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
alter table public.match_frames enable row level security;

-- true if you're a player in this duel
create or replace function public.fc_in_match(p_match uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from match_players mp join profiles p on p.id = mp.user_id
                  where mp.match_id = p_match and p.owner = auth.uid())
$$;

drop policy if exists "read frames" on public.match_frames;
create policy "read frames" on public.match_frames for select to authenticated using (public.fc_in_match(match_id));

-- the site calls this about once a second during a duel with a small snapshot of your face
create or replace function public.push_frame(p_match uuid, p_img text, p_score int, p_flags jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := fc_me(); st text;
begin
  if p_img is null or length(p_img) > 60000 or left(p_img, 23) <> 'data:image/jpeg;base64,' then raise exception 'bad frame'; end if;
  select status into st from matches where id = p_match;
  if st is null or st = 'done' then return; end if;
  if not exists (select 1 from match_players where match_id = p_match and user_id = me) then raise exception 'you are not in this duel'; end if;
  insert into match_frames (match_id, user_id, img, score, flags, updated_at)
  values (p_match, me, p_img, least(100, greatest(0, p_score)),
          case when jsonb_typeof(p_flags) = 'array' then p_flags else '[]'::jsonb end, now())
  on conflict (match_id, user_id) do update
    set img = excluded.img, score = excluded.score, flags = excluded.flags, updated_at = now();
end $$;

-- snapshots are only for the live round: clear them when a duel ends
create or replace function public.fc_clear_frames() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'done' then delete from match_frames where match_id = new.id; end if;
  return new;
end $$;
drop trigger if exists fc_clear_frames on public.matches;
create trigger fc_clear_frames after update of status on public.matches
  for each row execute function public.fc_clear_frames();

revoke execute on function public.fc_in_match(uuid), public.push_frame(uuid,text,int,jsonb), public.fc_clear_frames() from public, anon;
grant execute on function public.fc_in_match(uuid), public.push_frame(uuid,text,int,jsonb) to authenticated;

-- ---------- live updates ----------
alter table public.matches       replica identity full;
alter table public.match_players replica identity full;
do $$ begin
  begin alter publication supabase_realtime add table public.profiles;      exception when others then null; end;
  begin alter publication supabase_realtime add table public.matches;       exception when others then null; end;
  begin alter publication supabase_realtime add table public.match_players; exception when others then null; end;
end $$;
