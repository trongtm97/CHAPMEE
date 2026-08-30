-- Love Insight utility tables (bói tình yêu)

DO $$ BEGIN
  CREATE TYPE love_reading_type AS ENUM ('NAME_ONLY', 'NAME_DOB');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE love_privacy_mode AS ENUM ('FULL_NAMES', 'INITIALS', 'HIDDEN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE love_element AS ENUM ('WOOD', 'FIRE', 'EARTH', 'METAL', 'WATER', 'UNKNOWN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE love_gender_common AS ENUM ('MALE', 'FEMALE', 'UNISEX', 'UNKNOWN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS love_readings (
  id TEXT PRIMARY KEY,
  input_hash TEXT NOT NULL UNIQUE,
  share_id TEXT NOT NULL UNIQUE,
  reading_type love_reading_type NOT NULL,
  person_a_name TEXT NOT NULL,
  person_b_name TEXT NOT NULL,
  person_a_initial TEXT NOT NULL,
  person_b_initial TEXT NOT NULL,
  person_a_dob TIMESTAMPTZ,
  person_b_dob TIMESTAMPTZ,
  relationship_status TEXT,
  privacy_mode love_privacy_mode NOT NULL,
  total_score INTEGER NOT NULL,
  level_label TEXT NOT NULL,
  subscores JSONB NOT NULL,
  modules JSONB NOT NULL,
  reason_codes JSONB NOT NULL,
  summary TEXT NOT NULL,
  trust_explanation TEXT NOT NULL,
  calculation_breakdown JSONB NOT NULL,
  personalized_insights JSONB NOT NULL,
  strengths JSONB NOT NULL,
  risks JSONB NOT NULL,
  advice JSONB NOT NULL,
  ad_hints JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS love_readings_type_created_idx ON love_readings (reading_type, created_at);
CREATE INDEX IF NOT EXISTS love_readings_created_at_idx ON love_readings (created_at);

CREATE TABLE IF NOT EXISTS love_vietnamese_names (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL UNIQUE,
  meaning TEXT NOT NULL,
  semantic_tags JSONB NOT NULL,
  symbolic_element love_element NOT NULL,
  love_style TEXT NOT NULL,
  strengths TEXT NOT NULL,
  risks TEXT NOT NULL,
  advice TEXT NOT NULL,
  gender_common love_gender_common NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS love_vietnamese_names_gender_idx ON love_vietnamese_names (gender_common);
