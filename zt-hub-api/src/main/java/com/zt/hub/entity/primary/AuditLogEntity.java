package com.zt.hub.entity.primary;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "ZT_AUDIT_LOG", indexes = @Index(name = "IX_ZT_AUDIT_LOG_CREATED_AT", columnList = "created_at"))
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "action", nullable = false, length = 32)
    private String action;

    @Column(name = "resource", length = 128)
    private String resource;

    @Column(name = "resource_id", length = 128)
    private String resourceId;

    @Column(name = "before_json", columnDefinition = "nvarchar(max)")
    private String beforeJson;

    @Column(name = "after_json", columnDefinition = "nvarchar(max)")
    private String afterJson;

    @Column(name = "ip", length = 64)
    private String ip;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void setCreatedAt() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
