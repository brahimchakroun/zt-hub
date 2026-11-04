package com.zt.hub.repository.primary;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zt.hub.entity.primary.AuditLogEntity;

public interface AuditRepository extends JpaRepository<AuditLogEntity, Long> {
}
