package com.zt.hub.service;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;

@Service
public class AuthAuditService {
    private final JdbcTemplate jdbcTemplate;
    private final HttpServletRequest request;

    public AuthAuditService(JdbcTemplate jdbcTemplate, HttpServletRequest request) {
        this.jdbcTemplate = jdbcTemplate;
        this.request = request;
    }

    public void record(UUID userId, String action, String resource, String resourceId,
                       String beforeJson, String afterJson) {
        jdbcTemplate.update("INSERT INTO ZT_AUDIT_LOG " +
                        "(user_id, action, resource, resource_id, before_json, after_json, ip, user_agent, created_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE())",
                userId, action, resource, resourceId, beforeJson, afterJson,
                request.getRemoteAddr(), request.getHeader("User-Agent"));
    }
}
