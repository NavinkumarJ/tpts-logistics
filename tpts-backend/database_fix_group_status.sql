-- TPTS Database Fix: Group Status Update Issue
-- Problem: MySQL ENUM column doesn't include PICKUP_COMPLETE value
-- Solution: Convert status column from ENUM to VARCHAR to match JPA @Enumerated(EnumType.STRING)

-- Step 1: Check current column type
DESCRIBE group_shipments;

-- Step 2: Modify the status column from ENUM to VARCHAR(25)
-- This matches the JPA annotation: @Column(nullable = false, length = 25)
ALTER TABLE group_shipments 
MODIFY COLUMN status VARCHAR(25) NOT NULL DEFAULT 'OPEN';

-- Step 3: Update the stuck group to PICKUP_COMPLETE
-- Find groups where all parcels are AT_WAREHOUSE but group is still PICKUP_IN_PROGRESS
UPDATE group_shipments g
SET g.status = 'PICKUP_COMPLETE',
    g.pickup_completed_at = NOW()
WHERE g.status = 'PICKUP_IN_PROGRESS'
AND NOT EXISTS (
    SELECT 1 FROM parcels p 
    WHERE p.group_shipment_id = g.id 
    AND p.status NOT IN ('AT_WAREHOUSE', 'OUT_FOR_DELIVERY', 'DELIVERED')
);

-- Alternative: If you know the specific group ID, update directly:
-- UPDATE group_shipments SET status = 'PICKUP_COMPLETE', pickup_completed_at = NOW() WHERE id = 2;

-- Step 4: Verify the fix
SELECT id, group_code, status, pickup_completed_at FROM group_shipments ORDER BY id DESC LIMIT 5;
SELECT id, tracking_number, status, group_shipment_id FROM parcels WHERE group_shipment_id = 2;
