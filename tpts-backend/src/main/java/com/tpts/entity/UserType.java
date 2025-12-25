package com.tpts.entity;

/**
 * Enum representing different types of users in TPTS
 * - CUSTOMER: End users who create shipments
 * - COMPANY_ADMIN: Courier company administrators
 * - DELIVERY_AGENT: Agents who pickup/deliver parcels
 * - SUPER_ADMIN: Platform administrators
 */
public enum UserType {
    CUSTOMER,
    COMPANY_ADMIN,
    DELIVERY_AGENT,
    SUPER_ADMIN
}
