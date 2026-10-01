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
