package com.zt.hub.security;

import org.junit.jupiter.api.Test;

import java.util.Base64;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService(
            Base64.getEncoder().encodeToString(new byte[64]),
            3600,
            604800);

    @Test
    void generateAccessToken_thenValidateAndExtract() {
        String token = jwtService.generateAccessToken("jdoe", List.of("ADMIN", "USER"));

        assertTrue(jwtService.isTokenValid(token));
        assertEquals("access", jwtService.extractType(token));
        assertEquals("jdoe", jwtService.extractUsername(token));
        assertEquals(List.of("ADMIN", "USER"), jwtService.extractRoles(token));
    }

    @Test
    void generateRefreshToken_hasRefreshTypeAndNoRoles() {
        String token = jwtService.generateRefreshToken("jdoe");

        assertTrue(jwtService.isTokenValid(token));
        assertEquals("refresh", jwtService.extractType(token));
        assertTrue(jwtService.extractRoles(token).isEmpty());
    }

    @Test
    void invalidToken_isRejected() {
        assertFalse(jwtService.isTokenValid("not.a.token"));
        assertFalse(jwtService.isTokenValid(null));
    }
}
