package com.zt.hub.repository.primary;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zt.hub.entity.primary.ZtPasswordReset;

import java.util.Optional;

public interface ZtPasswordResetRepository extends JpaRepository<ZtPasswordReset, Long> {
    Optional<ZtPasswordReset> findByTokenHash(String tokenHash);
}
