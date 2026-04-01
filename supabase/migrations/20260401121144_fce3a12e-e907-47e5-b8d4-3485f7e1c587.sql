CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.user_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_input TEXT NOT NULL,
  input_type TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'unprocessed',
  review_status TEXT NOT NULL DEFAULT 'needs_review',
  ai_data JSONB,
  processed BOOLEAN NOT NULL DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  manually_adjusted BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_pinned_today BOOLEAN NOT NULL DEFAULT false,
  idea_status TEXT NOT NULL DEFAULT 'new',
  converted_to_project_at TIMESTAMPTZ,
  source_project_id TEXT,
  source_action_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_captures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own captures" ON public.user_captures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own captures" ON public.user_captures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own captures" ON public.user_captures FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own captures" ON public.user_captures FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_user_captures_updated_at BEFORE UPDATE ON public.user_captures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  priority TEXT NOT NULL DEFAULT 'medium',
  progress INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '--brain-teal',
  next_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  timeline JSONB NOT NULL DEFAULT '[]'::jsonb,
  linked_capture_ids TEXT[] NOT NULL DEFAULT '{}',
  source_idea_id TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects" ON public.user_projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON public.user_projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON public.user_projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON public.user_projects FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_user_projects_updated_at BEFORE UPDATE ON public.user_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_memory_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  summary TEXT NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'note',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  linked_project_ids TEXT[] NOT NULL DEFAULT '{}',
  linked_idea_ids TEXT[] NOT NULL DEFAULT '{}',
  source_capture_id TEXT,
  last_reviewed_at TIMESTAMPTZ,
  importance_score INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_memory_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own memories" ON public.user_memory_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own memories" ON public.user_memory_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own memories" ON public.user_memory_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own memories" ON public.user_memory_entries FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_user_memory_entries_updated_at BEFORE UPDATE ON public.user_memory_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.user_review_meta (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  last_daily_review_at TIMESTAMPTZ,
  last_weekly_review_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_review_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own review meta" ON public.user_review_meta FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own review meta" ON public.user_review_meta FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own review meta" ON public.user_review_meta FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own review meta" ON public.user_review_meta FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_user_review_meta_updated_at BEFORE UPDATE ON public.user_review_meta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_user_captures_user_id ON public.user_captures(user_id);
CREATE INDEX idx_user_captures_status ON public.user_captures(user_id, status);
CREATE INDEX idx_user_projects_user_id ON public.user_projects(user_id);
CREATE INDEX idx_user_memory_entries_user_id ON public.user_memory_entries(user_id);
CREATE INDEX idx_user_review_meta_user_id ON public.user_review_meta(user_id);