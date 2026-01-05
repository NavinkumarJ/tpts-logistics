-- Add metadata column to payments for storing parcel data before parcel creation
ALTER TABLE payments ADD COLUMN metadata TEXT;

-- Make parcel_id nullable (for payment-first flow) - MySQL syntax
ALTER TABLE payments MODIFY COLUMN parcel_id BIGINT NULL;
