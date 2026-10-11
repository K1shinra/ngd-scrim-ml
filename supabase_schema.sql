-- ============================================================================
-- NGD Scrim Management System — Supabase SQL Setup
-- Copy and paste this entire script into the Supabase SQL Editor and click RUN
-- ============================================================================

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "uid" text NOT NULL UNIQUE,
  "email" text NOT NULL,
  "display_name" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "scrim_slots" (
  "slot_number" integer PRIMARY KEY NOT NULL,
  "ign" text NOT NULL,
  "role" text NOT NULL,
  "secondary_role" text,
  "role_label" text NOT NULL,
  "is_ready" boolean DEFAULT true NOT NULL,
  "assigned_at" text NOT NULL,
  "user_uid" text,
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "players" (
  "id" serial PRIMARY KEY NOT NULL,
  "ign" text NOT NULL UNIQUE,
  "squad_tag" text DEFAULT 'NGD' NOT NULL,
  "primary_role" text NOT NULL,
  "secondary_role" text NOT NULL,
  "role_label" text NOT NULL,
  "wins" integer DEFAULT 0 NOT NULL,
  "losses" integer DEFAULT 0 NOT NULL,
  "mvp_count" integer DEFAULT 0 NOT NULL,
  "streak" integer DEFAULT 0 NOT NULL,
  "role_counts_json" text DEFAULT '{}' NOT NULL,
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "scrim_matches" (
  "id" text PRIMARY KEY NOT NULL,
  "match_id" text NOT NULL,
  "room_name" text NOT NULL,
  "started_at" text NOT NULL,
  "team_blue_json" text NOT NULL,
  "team_red_json" text NOT NULL,
  "mvp_ign" text NOT NULL,
  "shuffle_note" text,
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "match_history" (
  "id" serial PRIMARY KEY NOT NULL,
  "match_code" text NOT NULL,
  "room_name" text NOT NULL,
  "completed_at" text NOT NULL,
  "winner" text NOT NULL,
  "mvp_ign" text NOT NULL,
  "team_blue_json" text NOT NULL,
  "team_red_json" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

-- Enable public access for the Scrim Lobby on Supabase
ALTER TABLE "scrim_slots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "players" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scrim_matches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "match_history" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access scrim_slots" ON "scrim_slots";
CREATE POLICY "Public access scrim_slots" ON "scrim_slots" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access players" ON "players";
CREATE POLICY "Public access players" ON "players" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access scrim_matches" ON "scrim_matches";
CREATE POLICY "Public access scrim_matches" ON "scrim_matches" FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access match_history" ON "match_history";
CREATE POLICY "Public access match_history" ON "match_history" FOR ALL USING (true) WITH CHECK (true);
