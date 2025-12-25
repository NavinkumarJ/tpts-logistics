-- Migration Script: Add vehicle_photo_url column and copy document URLs
-- This fixes the bug where documents were not copied when agents were hired

-- Step 1: Add vehicle_photo_url column to job_applications if it doesn't exist
-- (MySQL syntax - run manually if auto-migrate doesn't work)
-- ALTER TABLE job_applications ADD COLUMN vehicle_photo_url VARCHAR(500) NULL;

-- Step 2: Copy document URLs from job_applications to delivery_agents (including vehicle_photo_url)
UPDATE delivery_agents da
JOIN job_applications ja ON ja.hired_as_agent_id = da.id
SET 
    da.profile_photo_url = COALESCE(da.profile_photo_url, ja.photo_url),
    da.license_document_url = COALESCE(da.license_document_url, ja.license_document_url),
    da.aadhaar_document_url = COALESCE(da.aadhaar_document_url, ja.aadhaar_document_url),
    da.rc_document_url = COALESCE(da.rc_document_url, ja.rc_document_url),
    da.vehicle_photo_url = COALESCE(da.vehicle_photo_url, ja.vehicle_photo_url),
    da.additional_documents = COALESCE(da.additional_documents, ja.additional_documents)
WHERE ja.status = 'HIRED'
  AND ja.hired_as_agent_id IS NOT NULL;

-- Verify the update (uncomment to run)
-- SELECT 
--     da.id as agent_id,
--     da.full_name,
--     ja.id as job_app_id,
--     da.profile_photo_url,
--     da.license_document_url,
--     da.aadhaar_document_url,
--     da.rc_document_url,
--     da.vehicle_photo_url
-- FROM delivery_agents da
-- JOIN job_applications ja ON ja.hired_as_agent_id = da.id;
