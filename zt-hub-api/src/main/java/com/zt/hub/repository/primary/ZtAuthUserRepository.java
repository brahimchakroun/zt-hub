package com.zt.hub.repository.primary;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zt.hub.entity.primary.ZtAuthUser;

import java.util.Optional;
import java.util.UUID;

public interface ZtAuthUserRepository extends JpaRepository<ZtAuthUser, UUID> {
    Optional<ZtAuthUser> findByUsername(String username);
    Optional<ZtAuthUser> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
