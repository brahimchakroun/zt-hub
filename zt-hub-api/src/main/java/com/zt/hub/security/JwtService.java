package com.zt.hub.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;

@Service
public class JwtService {

    public static final String CLAIM_TYPE = "type";
    public static final String CLAIM_ROLES = "roles";
    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_REFRESH = "refresh";

    private final SecretKey signingKey;
    private final long accessExpirationSeconds;
    private final long refreshExpirationSeconds;

    public JwtService(@Value("${app.jwt.secret}") String base64Secret,
                      @Value("${app.jwt.access-expiration-seconds}") long accessExpirationSeconds,
                      @Value("${app.jwt.refresh-expiration-seconds}") long refreshExpirationSeconds) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(base64Secret));
        this.accessExpirationSeconds = accessExpirationSeconds;
        this.refreshExpirationSeconds = refreshExpirationSeconds;
    }

    public String generateAccessToken(String username, List<String> roles) {
        return buildToken(username, TYPE_ACCESS, roles, accessExpirationSeconds);
    }

    public String generateRefreshToken(String username) {
        return buildToken(username, TYPE_REFRESH, null, refreshExpirationSeconds);
    }

    private String buildToken(String username, String type, List<String> roles, long ttlSeconds) {
        Date now = new Date();
        var builder = Jwts.builder()
                .subject(username)
                .claim(CLAIM_TYPE, type)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + ttlSeconds * 1000));
        if (roles != null) {
            builder.claim(CLAIM_ROLES, roles);
        }
        return builder.signWith(signingKey).compact();
    }

    public Claims extractClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public boolean isTokenValid(String token) {
        try {
            extractClaims(token);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    public String extractType(String token) {
        return extractClaims(token).get(CLAIM_TYPE, String.class);
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {
        List<String> roles = extractClaims(token).get(CLAIM_ROLES, List.class);
        return roles == null ? List.of() : roles;
    }

    public long getAccessExpirationSeconds() {
        return accessExpirationSeconds;
    }

    public long getRefreshExpirationSeconds() {
        return refreshExpirationSeconds;
    }
}
