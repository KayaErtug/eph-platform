-- 1. AlterTable: Add listingNumber if not exists
ALTER TABLE "NetworkPost" ADD COLUMN IF NOT EXISTS "listingNumber" TEXT;

-- 2. Generator function: DB-level generator for DEFAULT and safe rollback compatibility
CREATE OR REPLACE FUNCTION eph_generate_network_listing_number()
RETURNS text AS $$
DECLARE
  chars text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  candidate text;
  i int;
  char_idx int;
BEGIN
  LOOP
    candidate := '';
    FOR i IN 1..7 LOOP
      char_idx := floor(random() * length(chars) + 1)::int;
      candidate := candidate || substr(chars, char_idx, 1);
    END LOOP;
    IF candidate ~ '[A-Z]' AND candidate ~ '[0-9]' THEN
      IF NOT EXISTS (SELECT 1 FROM "NetworkPost" WHERE "listingNumber" = candidate) THEN
        RETURN candidate;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 3. Set DEFAULT on listingNumber so older code and rollbacks can safely INSERT without error
ALTER TABLE "NetworkPost" ALTER COLUMN "listingNumber" SET DEFAULT eph_generate_network_listing_number();

-- 4. Safe Idempotent Backfill: Fill any existing NULL or empty listing numbers
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM "NetworkPost" WHERE "listingNumber" IS NULL OR "listingNumber" = '' ORDER BY "createdAt" ASC LOOP
    UPDATE "NetworkPost" SET "listingNumber" = eph_generate_network_listing_number() WHERE id = rec.id;
  END LOOP;
END $$;

-- 5. CreateIndex: Unique index on listingNumber
CREATE UNIQUE INDEX IF NOT EXISTS "NetworkPost_listingNumber_key" ON "NetworkPost"("listingNumber");

-- 6. AlterTable: Set NOT NULL after backfill and default are in place
ALTER TABLE "NetworkPost" ALTER COLUMN "listingNumber" SET NOT NULL;

-- 7. Constraint: Ensure exact 7-char format with at least one letter and one digit
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'NetworkPost_listingNumber_format_check'
      AND conrelid = '"NetworkPost"'::regclass
  ) THEN
    ALTER TABLE "NetworkPost" ADD CONSTRAINT "NetworkPost_listingNumber_format_check"
      CHECK ("listingNumber" ~ '^[0-9A-Z]{7}$' AND "listingNumber" ~ '[A-Z]' AND "listingNumber" ~ '[0-9]');
  END IF;
END $$;
