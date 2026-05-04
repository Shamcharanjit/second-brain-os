-- ────────────────────────────────────────────────────────────────────────────
-- Memory Embeddings (pgvector)
-- Adds a vector column to user_memory for semantic similarity search.
-- ────────────────────────────────────────────────────────────────────────────

-- Enable pgvector extension (idempotent)
create extension if not exists vector with schema extensions;

-- Add embedding column (text-embedding-004 produces 768-dim vectors)
alter table public.user_memory
  add column if not exists embedding extensions.vector(768);

-- HNSW index for fast cosine similarity queries
create index if not exists idx_user_memory_embedding
  on public.user_memory
  using hnsw (embedding extensions.vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- RPC function: semantic search for the current user
-- Returns memory rows ordered by cosine similarity, filtered by user_id via RLS.
create or replace function public.search_memories_semantic(
  query_embedding extensions.vector(768),
  match_count      int default 10,
  similarity_threshold float default 0.35
)
returns table (
  id               uuid,
  title            text,
  raw_text         text,
  summary          text,
  memory_type      text,
  importance_score int,
  tags             text[],
  is_archived      boolean,
  created_at       timestamptz,
  similarity       float
)
language plpgsql security definer
as $$
begin
  return query
  select
    m.id,
    m.title,
    m.raw_text,
    m.summary,
    m.memory_type,
    m.importance_score,
    m.tags,
    m.is_archived,
    m.created_at,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.user_memory m
  where
    m.user_id = auth.uid()
    and m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) >= similarity_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
end;
$$;
