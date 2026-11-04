package com.zt.hub.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Trace technique de chaque requete : URL, utilisateur, temps d'execution, code HTTP.
 * Les parametres sensibles (password, token, secret) sont masques.
 * Enregistre dans la chaine Spring Security (voir SecurityConfig).
 */
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);
    private static final String MASK = "***";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        long start = System.currentTimeMillis();
        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - start;
            String user = currentUser();
            log.info("method={} uri={} user={} status={} duration={}ms",
                    request.getMethod(), sanitizeUri(request), user, response.getStatus(), duration);
        }
    }

    private String currentUser() {
        return java.util.Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(Authentication::isAuthenticated)
                .map(Authentication::getName)
                .orElse("anonymous");
    }

    /** Masque les valeurs des parametres sensibles dans la query string. */
    private String sanitizeUri(HttpServletRequest request) {
        String uri = request.getRequestURI();
        String query = request.getQueryString();
        if (query == null || query.isBlank()) {
            return uri;
        }
        String sanitized = Arrays.stream(query.split("&"))
                .map(param -> {
                    int idx = param.indexOf('=');
                    String name = idx >= 0 ? param.substring(0, idx) : param;
                    String value = idx >= 0 ? param.substring(idx + 1) : "";
                    boolean sensitive = name.toLowerCase(Locale.ROOT).matches(".*(password|token|secret).*");
                    return name + "=" + (sensitive ? MASK : value);
                })
                .collect(Collectors.joining("&"));
        return uri + "?" + sanitized;
    }
}
