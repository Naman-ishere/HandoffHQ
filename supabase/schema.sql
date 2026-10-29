-- =============================================================================
-- HandoffHQ Supabase PostgreSQL Schema (supabase/schema.sql)
-- =============================================================================
-- IMPORTANT SECURITY NOTE (HACKATHON PUBLIC DEMO ONLY):
-- The Row Level Security (RLS) policies below intentionally permit anonymous
-- (anon) SELECT, INSERT, and UPDATE operations on `public.handovers` so judges
-- can test the multi-persona workflow without an email/password login wall.
-- DELETE is explicitly forbidden so demo rows with fixed UUIDs cannot be wiped
-- (1-click Demo Reset uses deterministic UPSERT on fixed UUIDs).
-- Do NOT use these permissive anon policies for real or sensitive client data.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.handovers (
  id UUID PRIMARY KEY,
  project_name TEXT NOT NULL CHECK (char_length(trim(project_name)) BETWEEN 1 AND 120),
  client_name TEXT NOT NULL CHECK (char_length(trim(client_name)) BETWEEN 1 AND 120),
  deal_value NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (deal_value >= 0),
  target_launch_date DATE NULL,

  -- Strict state machine constraint
  status TEXT NOT NULL DEFAULT 'Blocked'
    CHECK (status IN ('Draft', 'Blocked', 'Ready for Delivery', 'Handed Over')),

  scope_summary TEXT NOT NULL DEFAULT '' CHECK (char_length(scope_summary) <= 3000),
  sales_owner_name TEXT NOT NULL DEFAULT 'Aarav Mehta (Sales Rep)',
  delivery_owner_id TEXT NULL,
  delivery_owner_name TEXT NULL,

  -- Embedded JSONB checklists with payload size sanity bounds
  deliverables JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(deliverables) = 'array' AND jsonb_array_length(deliverables) <= 30),
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(dependencies) = 'array' AND jsonb_array_length(dependencies) <= 30),
  document_links JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(document_links) = 'array' AND jsonb_array_length(document_links) <= 20),
  activity_logs JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(activity_logs) = 'array' AND jsonb_array_length(activity_logs) <= 100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast dashboard status filtering and sorting
CREATE INDEX IF NOT EXISTS idx_handovers_status_updated
  ON public.handovers (status, updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.handovers ENABLE ROW LEVEL SECURITY;

-- Scoped Demo RLS Policies: Allow SELECT, INSERT, UPDATE for public demo, but FORBID DELETE
-- (Demo resets use deterministic UPSERT on fixed UUIDs so rows cannot be deleted maliciously)
DROP POLICY IF EXISTS "demo_select_handovers" ON public.handovers;
CREATE POLICY "demo_select_handovers" ON public.handovers
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "demo_insert_handovers" ON public.handovers;
CREATE POLICY "demo_insert_handovers" ON public.handovers
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "demo_update_handovers" ON public.handovers;
CREATE POLICY "demo_update_handovers" ON public.handovers
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

