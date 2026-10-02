-- Mastery trajectory snapshots.
-- Each completed assessment creates one immutable snapshot per topic.

create table if not exists public.topic_mastery_history (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  topic text not null,
  assessment_attempt_id uuid not null references public.assessment_attempts(id) on delete cascade,
  assessment_score numeric(5,2) not null
    check (assessment_score >= 0 and assessment_score <= 100),
  previous_mastery_score numeric(5,2) not null default 0
    check (previous_mastery_score >= 0 and previous_mastery_score <= 100),
  mastery_score numeric(5,2) not null
    check (mastery_score >= 0 and mastery_score <= 100),
  mastery_delta numeric(6,2) not null default 0,
  evidence_count integer not null default 0
    check (evidence_count >= 0),
  created_at timestamptz not null default now(),
  unique(assessment_attempt_id, course_id, topic)
);

create index if not exists topic_mastery_history_user_topic_idx
  on public.topic_mastery_history(user_id, course_id, topic, created_at desc);

create index if not exists topic_mastery_history_attempt_idx
  on public.topic_mastery_history(assessment_attempt_id);

alter table public.topic_mastery_history enable row level security;

revoke all on table public.topic_mastery_history from anon, authenticated;
grant select, insert on table public.topic_mastery_history to authenticated;

drop policy if exists "topic_mastery_history_select_own" on public.topic_mastery_history;
create policy "topic_mastery_history_select_own"
  on public.topic_mastery_history
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "topic_mastery_history_insert_own" on public.topic_mastery_history;
create policy "topic_mastery_history_insert_own"
  on public.topic_mastery_history
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
