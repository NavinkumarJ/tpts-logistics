-- V1001__add_warehouse_fields_to_group_shipments.sql
-- Add warehouse address fields for Two-Agent Model

ALTER TABLE group_shipments
ADD COLUMN warehouse_address TEXT DEFAULT NULL,
ADD COLUMN warehouse_city VARCHAR(100) DEFAULT NULL,
ADD COLUMN warehouse_pincode VARCHAR(10) DEFAULT NULL,
ADD COLUMN warehouse_latitude DECIMAL(10,8) DEFAULT NULL,
ADD COLUMN warehouse_longitude DECIMAL(11,8) DEFAULT NULL;

-- Add index for warehouse city queries
CREATE INDEX idx_group_warehouse_city ON group_shipments(warehouse_city);
