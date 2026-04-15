CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  organisation TEXT,
  role_profession TEXT,
  attendance_type TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abstract_submissions (
  id SERIAL PRIMARY KEY,
  presenter_name TEXT NOT NULL,
  email TEXT NOT NULL,
  organisation TEXT,
  role_profession TEXT,
  presentation_preference TEXT NOT NULL,
  title TEXT NOT NULL,
  aim_text TEXT NOT NULL,
  methods_text TEXT NOT NULL,
  results_text TEXT NOT NULL,
  total_word_count INTEGER NOT NULL DEFAULT 0,
  declaration_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS abstract_uploads (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL REFERENCES abstract_submissions(id) ON DELETE CASCADE,
  section_name TEXT NOT NULL CHECK (section_name IN ('aim','methods','results')),
  upload_kind TEXT NOT NULL CHECK (upload_kind IN ('diagram','table')),
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(submission_id, section_name, upload_kind)
);
