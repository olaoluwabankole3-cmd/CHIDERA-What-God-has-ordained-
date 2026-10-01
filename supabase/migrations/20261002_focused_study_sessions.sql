-- Focused study sessions
-- Records active study time and interaction, while keeping mastery scores assessment-driven.

create table if not exists public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  deadline_id uuid references public.academic_deadlines(id) on delete set null,
  focus_topic text,
  scheduled_minutes smallint not null default 25
    check (scheduled_minutes between 5 and 360),
  active_seconds integer not null default 0
    check (active_seconds >= 0),
  interaction_count integer not null default 0
    check (interaction_count >= 0),
  status text not null default 'active'
    check (status in ('active','completed','abandoned')),
  self_rating smallint
    check (self_rating is null or self_rating between 1 and 5),
  reflection text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists study_sessions_user_started_idx
  on public.study_sessions(user_id, started_at desc);

create index if not exists study_sessions_course_started_idx
  on public.study_sessions(course_id, started_at desc);

create index if not exists study_sessions_topic_idx
  on public.study_sessions(user_id, course_id, focus_topic);

alter table public.study_sessions enable row level security;

drop policy if exists "study_sessions_own_all" on public.study_sessions;
create policy "study_sessions_own_all"
  on public.study_sessions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter table public.topic_mastery
  add column if not exists study_minutes integer not null default 0
    check (study_minutes >= 0);

alter table public.topic_mastery
  add column if not exists study_sessions integer not null default 0
    check (study_sessions >= 0);

alter table public.topic_mastery
  add column if not exists last_studied_at timestamptz;

create or replace function public.complete_study_session(
  p_session_id uuid,
  p_active_seconds integer,
  p_interaction_count integer,
  p_self_rating smallint,
  p_reflection text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.study_sessions%rowtype;
  v_active_seconds integer;
  v_study_minutes integer;
  v_reflection text;
begin
  select *
  into v_session
  from public.study_sessions
  where id = p_session_id
    and user_id = (select auth.uid())
    and status = 'active'
  for update;

  if not found then
    raise exception 'Study session not found or already completed';
  end if;

  v_active_seconds := greatest(
    0,
    least(
      coalesce(p_active_seconds, 0),
      greatest(0, floor(extract(epoch from (now() - v_session.started_at)))::integer)
    )
  );

  v_study_minutes := floor(v_active_seconds / 60.0)::integer;
  v_reflection := nullif(left(trim(coalesce(p_reflection, '')), 500), '');

  update public.study_sessions
  set
    active_seconds = v_active_seconds,
    interaction_count = greatest(0, coalesce(p_interaction_count, 0)),
    self_rating = case
      when p_self_rating between 1 and 5 then p_self_rating
      else null
    end,
    reflection = v_reflection,
    status = 'completed',
    completed_at = now()
  where id = v_session.id;

  if nullif(trim(v_session.focus_topic), '') is not null then
    insert into public.topic_mastery (
      user_id,
      course_id,
      topic,
      mastery_score,
      evidence_count,
      study_minutes,
      study_sessions,
      last_studied_at,
      updated_at
    )
    values (
      v_session.user_id,
      v_session.course_id,
      trim(v_session.focus_topic),
      0,
      0,
      v_study_minutes,
      1,
      now(),
      now()
    )
    on conflict (user_id, course_id, topic)
    do update set
      study_minutes = public.topic_mastery.study_minutes + excluded.study_minutes,
      study_sessions = public.topic_mastery.study_sessions + 1,
      last_studied_at = now(),
      updated_at = now();
  end if;

  return jsonb_build_object(
    'sessionId', v_session.id,
    'activeSeconds', v_active_seconds,
    'studyMinutes', v_study_minutes,
    'interactionCount', greatest(0, coalesce(p_interaction_count, 0)),
    'status', 'completed'
  );
end;
$$;

grant execute on function public.complete_study_session(
  uuid,
  integer,
  integer,
  smallint,
  text
) to authenticated;
