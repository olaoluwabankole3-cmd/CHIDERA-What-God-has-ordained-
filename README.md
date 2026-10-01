# Academic AI — MVP foundation

A university-focused AI learning workspace.

## What is implemented

- Landing page
- Supabase account creation/sign-in flow
- Academic onboarding UI
- Student dashboard
- Course workspaces
- Interactive course-specific AI tutor
- Private PDF upload to Supabase Storage
- PDF page-level text extraction
- Semantic chunking + OpenAI embeddings
- PostgreSQL + pgvector storage
- Course-scoped semantic retrieval
- Tutor answers grounded in uploaded notes
- Retrieved material/page citations displayed in the tutor UI
- Data structures for assessments, conversations and topic mastery

## 1. Run locally

Requirements: Node.js 22+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## 2. Environment variables

```env
OPENAI_API_KEY=your_key_here
OPENAI_TUTOR_MODEL=gpt-5
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

The service-role key is reserved for future trusted server workflows. The current PDF RAG path uses the signed-in student's Supabase session and RLS rather than bypassing RLS.

## 3. Set up Supabase

Create a Supabase project and run `supabase/schema.sql` in the SQL editor.

That schema:

- enables pgvector
- creates the Academic AI application tables
- enables Row Level Security
- creates the `course-materials` private Storage bucket
- limits the bucket to PDFs up to 20 MB
- restricts Storage access to the authenticated user's top-level folder
- adds the `match_material_chunks` semantic-search function

## 4. Current routes

- `/` — product landing page
- `/auth` — Supabase email/password account creation and sign-in
- `/onboarding` — academic profile setup
- `/dashboard` — student academic home
- `/courses/mth-211` — example course workspace
- `/api/materials` — list the signed-in student's indexed course materials
- `/api/materials/process` — process an uploaded PDF into page-aware vector chunks
- `/api/tutor` — retrieve course chunks and generate a grounded tutor response

## 5. PDF RAG flow

```text
Student selects a PDF
        ↓
Browser uploads to private Supabase Storage
        ↓
/api/materials/process authenticates the student
        ↓
PDF text is extracted page-by-page
        ↓
Text is normalized and split into overlapping chunks
        ↓
text-embedding-3-small creates 1536-dimension vectors
        ↓
Chunks + page metadata are stored in material_chunks
        ↓
Student asks the tutor a question
        ↓
Question embedding → match_material_chunks()
        ↓
Relevant excerpts are injected into the tutor prompt
        ↓
Tutor answer + retrieved note/page sources
```

### Current ingestion limits

For the MVP:

- PDF only
- 20 MB maximum file size
- 120 pages maximum per PDF
- image-only/scanned PDFs need OCR support in a later iteration

## 6. Next engineering milestones

1. Replace remaining mock academic/course data with persisted Supabase data.
2. Add material deletion, retry and processing-state management.
3. Add scanned-PDF OCR and PowerPoint/DOCX ingestion.
4. Build quizzes and mock exams generated from the same course knowledge base.
5. Track topic mastery from tutor sessions and assessment attempts.
6. Add voice tutoring.
7. Add generated lecture-video workflows.

## Important product principle

The AI should distinguish between teaching/practice and doing a student's active graded work for them. For high-stakes academic information, source-grounded answers should show the course material used.
