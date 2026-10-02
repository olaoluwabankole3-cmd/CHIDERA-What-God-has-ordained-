-- Academic AI MVP schema
-- Run in a fresh Supabase project's SQL editor.

create extension if not exists "uuid-ossp";
create extension if not exists vector;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  university text not null,
  faculty text,
  department text not null,
  level text not null,
  semester text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  code text not null,
  title text not null,
  lecturer text,
  semester text,
  color_key text,
  created_at timestamptz not null default now(),
  unique(user_id, code)
);

create table if not exists public.materials (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  material_type text not null default 'lecture_note' check (material_type in ('lecture_note','slide','textbook','past_question','aoc','assignment','recording','other')),
  storage_path text,
  mime_type text,
  status text not null default 'uploaded' check (status in ('uploaded','processing','ready','failed')),
  page_count integer,
  created_at timestamptz not null default now()
);

create table if not exists public.material_chunks (
  id bigserial primary key,
  material_id uuid not null references public.materials(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  page_number integer,
  section_title text,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique(material_id, chunk_index)
);

create index if not exists material_chunks_course_idx on public.material_chunks(course_id);
create index if not exists material_chunks_embedding_idx on public.material_chunks using hnsw (embedding vector_cosine_ops);

create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade,
  title text,
  mode text not null default 'tutor' check (mode in ('tutor','revision','exam_prep','assignment_help')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id bigserial primary key,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  assessment_type text not null check (assessment_type in ('quiz','mock_exam','flashcards','practice_set')),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_attempts (
  id uuid primary key default uuid_generate_v4(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score numeric(5,2),
  answers jsonb not null default '[]'::jsonb,
  feedback jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.topic_mastery (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  topic text not null,
  mastery_score numeric(5,2) not null default 0 check (mastery_score >= 0 and mastery_score <= 100),
  evidence_count integer not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_id, course_id, topic)
);

create table if not exists public.topic_mastery_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  topic text not null,
  assessment_attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  assessment_score numeric(5,2) not null check (assessment_score >= 0 and assessment_score <= 100),
  previous_mastery_score numeric(5,2) not null default 0
    check (previous_mastery_score >= 0 and previous_mastery_score <= 100),
  mastery_score numeric(5,2) not null check (mastery_score >= 0 and mastery_score <= 100),
  mastery_delta numeric(6,2) not null default 0,
  evidence_count integer not null default 0 check (evidence_count >= 0),
  created_at timestamptz not null default now(),
  unique(assessment_attempt_id, course_id, topic)
);

create index if not exists topic_mastery_history_user_topic_idx
  on public.topic_mastery_history(user_id, course_id, topic, created_at desc);

create index if not exists topic_mastery_history_attempt_idx
  on public.topic_mastery_history(assessment_attempt_id);

create or replace function public.match_material_chunks(
  query_embedding vector(1536),
  match_course_id uuid,
  match_count int default 8,
  similarity_threshold float default 0.68
)
returns table (
  id bigint,
  material_id uuid,
  content text,
  page_number integer,
  section_title text,
  similarity float
)
language sql stable security invoker
as $$
  select
    mc.id,
    mc.material_id,
    mc.content,
    mc.page_number,
    mc.section_title,
    1 - (mc.embedding <=> query_embedding) as similarity
  from public.material_chunks mc
  where mc.course_id = match_course_id
    and mc.user_id = auth.uid()
    and mc.embedding is not null
    and 1 - (mc.embedding <=> query_embedding) >= similarity_threshold
  order by mc.embedding <=> query_embedding
  limit match_count;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.academic_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.materials enable row level security;
alter table public.material_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.assessments enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.topic_mastery enable row level security;
alter table public.topic_mastery_history enable row level security;

revoke all on table public.topic_mastery_history from anon, authenticated;
grant select, insert on table public.topic_mastery_history to authenticated;

create policy "profiles_own_all" on public.profiles for all using (id = auth.uid()) with check (id = auth.uid());
create policy "academic_profiles_own_all" on public.academic_profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "courses_own_all" on public.courses for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "materials_own_all" on public.materials for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "material_chunks_own_all" on public.material_chunks for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "conversations_own_all" on public.conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "messages_own_all" on public.messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "assessments_own_all" on public.assessments for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "assessment_attempts_own_all" on public.assessment_attempts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "topic_mastery_own_all" on public.topic_mastery for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "topic_mastery_history_select_own"
  on public.topic_mastery_history
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "topic_mastery_history_insert_own"
  on public.topic_mastery_history
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Private Storage bucket for student course materials.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-materials',
  'course-materials',
  false,
  20971520,
  array['application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course_materials_select_own" on storage.objects;
create policy "course_materials_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "course_materials_insert_own" on storage.objects;
create policy "course_materials_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "course_materials_delete_own" on storage.objects;
create policy "course_materials_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'course-materials'
  and (storage.foldername(name))[1] = auth.uid()::text
);


-- Exam/deadline intelligence.
create table if not exists public.study_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  daily_minutes smallint not null default 60 check (daily_minutes between 15 and 360),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academic_deadlines (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  assessment_type text not null default 'exam'
    check (assessment_type in ('exam','quiz','assignment','presentation','project','other')),
  due_at timestamptz not null,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_preferences_user_idx
  on public.study_preferences(user_id);

create index if not exists academic_deadlines_user_due_idx
  on public.academic_deadlines(user_id, due_at);

create index if not exists academic_deadlines_course_due_idx
  on public.academic_deadlines(course_id, due_at);

alter table public.study_preferences enable row level security;
alter table public.academic_deadlines enable row level security;

drop policy if exists "study_preferences_own_all" on public.study_preferences;
create policy "study_preferences_own_all"
  on public.study_preferences for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "academic_deadlines_own_all" on public.academic_deadlines;
create policy "academic_deadlines_own_all"
  on public.academic_deadlines for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);


-- Focused study sessions.
create table if not exists public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  deadline_id uuid references public.academic_deadlines(id) on delete set null,
  focus_topic text,
  scheduled_minutes smallint not null default 25 check (scheduled_minutes between 5 and 360),
  active_seconds integer not null default 0 check (active_seconds >= 0),
  interaction_count integer not null default 0 check (interaction_count >= 0),
  status text not null default 'active' check (status in ('active','completed','abandoned')),
  self_rating smallint check (self_rating is null or self_rating between 1 and 5),
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
  on public.study_sessions for all to authenticated
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
    self_rating = case when p_self_rating between 1 and 5 then p_self_rating else null end,
    reflection = v_reflection,
    status = 'completed',
    completed_at = now()
  where id = v_session.id;

  if nullif(trim(v_session.focus_topic), '') is not null then
    insert into public.topic_mastery (
      user_id, course_id, topic, mastery_score, evidence_count,
      study_minutes, study_sessions, last_studied_at, updated_at
    )
    values (
      v_session.user_id, v_session.course_id, trim(v_session.focus_topic),
      0, 0, v_study_minutes, 1, now(), now()
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

grant execute on function public.complete_study_session(uuid, integer, integer, smallint, text)
to authenticated;
