-- Remove signature_url column from parcels table
ALTER TABLE parcels DROP COLUMN IF EXISTS signature_url;
