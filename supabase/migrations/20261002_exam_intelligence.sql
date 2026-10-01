-- Exam/deadline intelligence
-- Apply after the existing Academic AI schema.

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
  on public.study_preferences
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "academic_deadlines_own_all" on public.academic_deadlines;
create policy "academic_deadlines_own_all"
  on public.academic_deadlines
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
