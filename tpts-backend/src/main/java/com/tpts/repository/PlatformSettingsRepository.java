// src/main/java/com/tpts/repository/PlatformSettingsRepository.java
package com.tpts.repository;

import com.tpts.entity.PlatformSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlatformSettingsRepository extends JpaRepository<PlatformSettings, Long> {

    /**
     * Get the first (and only) settings record
     * Platform settings is a singleton
     */
    Optional<PlatformSettings> findFirstByOrderByIdAsc();
}
