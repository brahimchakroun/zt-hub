
package com.zt.hub.service;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.zt.hub.audit.AuditAction;
import com.zt.hub.entity.primary.AuditLogEntity;
import com.zt.hub.repository.primary.AuditRepository;

/**
 * Journal technique : login, logout, creations, modifications, suppressions, erreurs.
 * L'ecriture se fait dans une transaction dediee (REQUIRES_NEW) : l'audit survit
 * au rollback de la transaction metier.
 */
@Service
@RequiredArgsConstructor 
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditRepository auditRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(AuditAction action, String entityName, String entityId, String detail) {
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            HttpServletRequest request = attributes == null ? null : attributes.getRequest();
            auditRepository.save(AuditLogEntity.builder()
                .userId(currentUserId())
                    .action(action.name())
                .resource(entityName != null ? truncate(entityName, 128) : null)
                .resourceId(entityId != null ? truncate(entityId, 128) : null)
                .afterJson(detail != null ? truncate(detail, 2000) : null)
                .ip(request == null ? null : truncate(request.getRemoteAddr(), 64))
                .userAgent(request == null ? null : truncate(request.getHeader("User-Agent"), 512))
                    .build());
        } catch (Exception e) {
            // L'audit ne doit jamais faire echouer le traitement metier
            log.warn("Echec de l'ecriture d'audit : {}", e.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logError(String detail) {
        log(AuditAction.ERROR, null, null, detail);
    }

    private java.util.UUID currentUserId() {
        return java.util.Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(Authentication::isAuthenticated)
                .map(Authentication::getName)
                .map(name -> {
                    try {
                        return java.util.UUID.fromString(name);
                    } catch (IllegalArgumentException ex) {
                        return null;
                    }
                })
                .orElse(null);
    }

    private String truncate(String value, int max) {
        return value.length() <= max ? value : value.substring(0, max);
    }
}
