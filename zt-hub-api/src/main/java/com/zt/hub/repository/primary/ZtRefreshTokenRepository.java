package com.zt.hub.repository.primary;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.zt.hub.entity.primary.ZtRefreshToken;

import java.util.Optional;
import java.util.UUID;

public interface ZtRefreshTokenRepository extends JpaRepository<ZtRefreshToken, Long> {
    Optional<ZtRefreshToken> findByTokenHash(String tokenHash);
    @Modifying
    @Query("update ZtRefreshToken t set t.revokedAt = CURRENT_TIMESTAMP where t.user.id = :userId and t.revokedAt is null")
    int revokeAllForUser(@Param("userId") UUID userId);
}
