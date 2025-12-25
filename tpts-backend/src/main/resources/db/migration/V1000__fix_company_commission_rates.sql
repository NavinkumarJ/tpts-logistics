-- Fix company commission rates to correct 10%/20% split
-- This updates all companies to use the correct default rates

-- Update all companies to have correct commission rates (10% platform, 20% agent)
UPDATE company_admin 
SET commission_rate = 10.0, 
    agent_commission_rate = 20.0
WHERE commission_rate != 10.0 OR agent_commission_rate != 20.0;

-- Recalculate earnings for all existing Earning records with correct rates
-- Platform gets 10%, Agent gets 20%, Company gets 70%
UPDATE earnings
SET platform_commission_rate = 10.0,
    platform_commission = order_amount * 0.10,
    agent_commission_rate = CASE WHEN agent_id IS NOT NULL THEN 20.0 ELSE 0.0 END,
    agent_earning = CASE WHEN agent_id IS NOT NULL THEN order_amount * 0.20 ELSE 0.0 END,
    company_earning = order_amount * 0.90,  -- 100% - 10% platform
    company_net_earning = order_amount * (CASE WHEN agent_id IS NOT NULL THEN 0.70 ELSE 0.90 END);  -- 70% if agent, 90% if no agent
