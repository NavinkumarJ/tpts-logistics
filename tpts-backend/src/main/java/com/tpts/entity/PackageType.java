package com.tpts.entity;

/**
 * Enum for Package Type
 * Different types of packages with different handling requirements
 */
public enum PackageType {
    DOCUMENT,    // Documents, papers
    SMALL,       // Small packages (< 1kg)
    MEDIUM,      // Medium packages (1-5kg)
    LARGE,       // Large packages (5-20kg)
    FRAGILE,     // Fragile items requiring careful handling
    ELECTRONICS  // Electronic items
}