-- E2EE Migration: Add encrypted columns to consultations table
-- Run this against the PostgreSQL database to add E2EE support.
-- These columns are nullable so existing data is unaffected.

ALTER TABLE consultations ADD COLUMN IF NOT EXISTS encrypted_final_text TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS encrypted_structured TEXT;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS e2ee_iv_b64 VARCHAR;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS e2ee_salt_b64 VARCHAR;
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS e2ee_sender_user_id INTEGER;
