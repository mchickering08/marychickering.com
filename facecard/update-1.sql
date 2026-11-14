-- Face Card update 1: backup route for duel face snapshots.
-- Safe to run on a live project: it does NOT reset the ladder or players.
-- Supabase → SQL Editor → New query → paste all of this → Run.

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
