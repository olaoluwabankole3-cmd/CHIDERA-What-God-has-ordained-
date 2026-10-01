# Academic AI — MVP foundation

A university-focused AI learning workspace. This first build includes:

- Landing page
- Supabase account creation/sign-in flow
- Academic onboarding flow
- Student dashboard
- Course workspaces
- Interactive course-specific AI tutor
- Demo tutor mode when no OpenAI key is configured
- Supabase-ready auth/database helpers
- PostgreSQL + pgvector schema for RAG
- Data structures for course materials, conversations, assessments and topic mastery

## 1. Run locally

Requirements: Node.js 22+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

The tutor works in demo mode without an OpenAI key. To enable the live tutor, add:

```env
OPENAI_API_KEY=your_key_here
OPENAI_TUTOR_MODEL=gpt-5
```

## 2. Connect Supabase

Create a Supabase project and run `supabase/schema.sql` in the SQL editor.

Then set:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

The schema already enables Row Level Security so each student can only access their own academic data.

## 3. Current routes

- `/` — product landing page
- `/auth` — Supabase email/password account creation and sign-in
- `/onboarding` — academic profile setup concept
- `/dashboard` — student academic home
- `/courses/mth-211` — example course workspace + tutor
- `/api/tutor` — live/demo AI tutor endpoint

## 4. Next engineering milestone: grounded course RAG

The next implementation should make uploaded notes usable by the tutor:

1. Upload PDF/PPT/DOC material to private object storage.
2. Extract text and preserve page/section metadata.
3. Chunk the material semantically.
4. Generate embeddings for each chunk.
5. Store chunks in `material_chunks`.
6. On each tutor question, embed the query and call `match_material_chunks`.
7. Pass only the most relevant chunks into the tutor prompt.
8. Return citations such as `Lecture Note — p. 27` with the answer.

## 5. Product phases

### MVP
Authentication, academic profile, courses, notes/material upload, grounded AI tutor, quizzes, mock exams, progress tracking.

### Phase 2
Voice tutoring, lecture transcription, flashcards, personalized study plans, richer analytics.

### Phase 3
Generated lecture videos, institution/lecturer workspaces, collaborative classes and mobile apps.

## Important product principle

The AI should distinguish between teaching/practice and doing a student's active graded work for them. For high-stakes academic information, source-grounded answers should show the exact course material used.
