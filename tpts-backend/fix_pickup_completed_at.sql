-- Fix pickupCompletedAt for groups that were completed but didn't have the timestamp set
-- Run this in MySQL to update the existing group's pickupCompletedAt

-- Update groups that have PICKUP_COMPLETE status but no pickupCompletedAt
UPDATE group_shipments 
SET pickup_completed_at = updated_at 
WHERE status = 'PICKUP_COMPLETE' 
  AND pickup_completed_at IS NULL;

-- Verify the update
SELECT id, group_code, status, pickup_completed_at, updated_at 
FROM group_shipments 
WHERE status IN ('PICKUP_COMPLETE', 'DELIVERY_IN_PROGRESS', 'COMPLETED');
