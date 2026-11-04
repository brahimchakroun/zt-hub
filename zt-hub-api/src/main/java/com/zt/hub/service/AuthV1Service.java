package com.zt.hub.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zt.hub.dto.*;
import com.zt.hub.entity.primary.ZtAuthUser;
import com.zt.hub.entity.primary.ZtPasswordReset;
import com.zt.hub.entity.primary.ZtRefreshToken;
import com.zt.hub.exception.AuthApiException;
import com.zt.hub.repository.primary.ZtAuthUserRepository;
import com.zt.hub.repository.primary.ZtPasswordResetRepository;
import com.zt.hub.repository.primary.ZtRefreshTokenRepository;
import com.zt.hub.security.AuthRsaJwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AuthV1Service {
    private static final String DISABLED = "Compte désactivé.";
    private static final String INVALID_CREDENTIALS = "Identifiants invalides.";
    private static final String FORGOT_MESSAGE = "Si l'email existe, un lien a été envoyé.";
    
    private final ZtAuthUserRepository users;
    private final ZtPasswordResetRepository resets;
    private final ZtRefreshTokenRepository refreshTokens;
    private final PasswordEncoder passwordEncoder;
    private final AuthRsaJwtService jwt;
    private final AuthAuditService audit;
    private final PageAccessService pageAccess;
    private final ObjectMapper objectMapper;
    private final HttpServletRequest request;
    private final HttpServletResponse response; // Ajouté pour manipuler les cookies
    private final SecureRandom random = new SecureRandom();
    private final Map<String, AttemptWindow> failures = new ConcurrentHashMap<>();

    public AuthV1Service(ZtAuthUserRepository users, ZtPasswordResetRepository resets,
                         ZtRefreshTokenRepository refreshTokens, PasswordEncoder passwordEncoder,
                         AuthRsaJwtService jwt, AuthAuditService audit, PageAccessService pageAccess,
                         ObjectMapper objectMapper, HttpServletRequest request, HttpServletResponse response) {
        this.users = users; this.resets = resets; this.refreshTokens = refreshTokens;
        this.passwordEncoder = passwordEncoder; this.jwt = jwt; this.audit = audit;
        this.pageAccess = pageAccess; this.objectMapper = objectMapper; this.request = request;
        this.response = response;
    }

    @Transactional
    public LoginResponse login(LoginRequest input) { // Retourne uniquement le profil utilisateur, les tokens sont dans les cookies
        String username = input.username().trim().toLowerCase();
        String ip = request.getRemoteAddr();
        checkRateLimit(ip);
        ZtAuthUser user = users.findByUsername(username).orElse(null);
        
        if (user != null && !"ACTIVE".equals(user.getStatus())) {
            throw new AuthApiException(HttpStatus.LOCKED, "auth.user.disabled", DISABLED);
        }
        if (user == null || !passwordEncoder.matches(input.password(), user.getPasswordHash())) {
            recordFailure(ip);
            audit.record(user == null ? null : user.getId(), "LOGIN_FAIL", "ZT_USER", user == null ? null : user.getId().toString(), null, null);
            throw new AuthApiException(HttpStatus.UNAUTHORIZED, "auth.credentials.invalid", INVALID_CREDENTIALS);
        }
        
        failures.remove(ip);
        user.recordLogin(ip);
        
        String access = jwt.generate(user.getId(), user.getUsername(), roles(user));
        String refresh = createRefreshToken(user);

        // 1. Injection du Token d'accès dans un cookie HttpOnly (ex: durée de vie du JWT)
        addCookie("accessToken", access, Duration.ofSeconds(jwt.getExpiresIn()));
        
        // 2. Injection du Refresh Token dans un cookie HttpOnly (ex: 7 jours)
        addCookie("refreshToken", refresh, Duration.ofDays(7));

        audit.record(user.getId(), "LOGIN_OK", "ZT_USER", user.getId().toString(), null, null);
        
        // RETOURNER LE TOKEN DANS LE JSON POUR LE PROJET 8443
    AuthUserDto userDto = pageAccess.getCurrentUser(user.getId());
    return new LoginResponse(userDto, access);
        // On retourne les informations de l'utilisateur (rôles, nom, etc.) pour le front, mais plus les tokens en clair
       // return pageAccess.getCurrentUser(user.getId());
    }

    @Transactional
    public Map<String, String> register(AuthRegisterRequest input) {
        String username = input.username().trim().toLowerCase();
        String email = input.email().trim().toLowerCase();
        if (users.existsByUsername(username)) throw new AuthApiException(HttpStatus.CONFLICT,
                "user.username.duplicate", "Ce nom d'utilisateur existe déjà.", "username");
        if (users.existsByEmail(email)) throw new AuthApiException(HttpStatus.CONFLICT,
                "user.email.duplicate", "Cette adresse email existe déjà.", "email");
        String encodedRoles = write(List.of("USER"));
        ZtAuthUser saved = users.save(new ZtAuthUser(username, email, input.firstName().trim(), input.lastName().trim(),
                passwordEncoder.encode(input.password()), encodedRoles, "ACTIVE"));
        audit.record(saved.getId(), "REGISTER", "ZT_USER", saved.getId().toString(), null, "{\"status\":\"ACTIVE\"}");
        return Map.of("message", "Compte créé avec succès. Connectez-vous.");
    }

    @Transactional
    public Map<String, String> forgotPassword(ForgotPasswordRequest input) {
        String email = input.email().trim().toLowerCase();
        users.findByEmail(email).ifPresent(user -> {
            byte[] bytes = new byte[32]; random.nextBytes(bytes);
            String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
            String hash = sha256(raw);
            resets.save(new ZtPasswordReset(user, hash, LocalDateTime.now().plusHours(1), request.getRemoteAddr()));
            String link = request.getRequestURL().toString().replace("/forgot-password", "/reset-password") + "?token=" + raw;
            org.slf4j.LoggerFactory.getLogger(AuthV1Service.class).info("Lien de réinitialisation simulé: {}", link);
            audit.record(user.getId(), "PASSWORD_RESET_REQUEST", "ZT_PASSWORD_RESET", null, null, null);
        });
        return Map.of("message", FORGOT_MESSAGE);
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest input) {
        ZtPasswordReset reset = resets.findByTokenHash(sha256(input.resetToken()))
                .orElseThrow(() -> new AuthApiException(HttpStatus.BAD_REQUEST, "auth.token.invalid", "Lien de réinitialisation invalide."));
        if (reset.getConsumedAt() != null) throw new AuthApiException(HttpStatus.BAD_REQUEST,
                "auth.token.invalid", "Lien de réinitialisation invalide.");
        if (!reset.getExpiresAt().isAfter(LocalDateTime.now())) throw new AuthApiException(HttpStatus.BAD_REQUEST,
                "auth.token.expired", "Le lien de réinitialisation a expiré.");
        ZtAuthUser user = reset.getUser();
        user.setPasswordHash(passwordEncoder.encode(input.newPassword()));
        reset.consume();
        refreshTokens.revokeAllForUser(user.getId());
        audit.record(user.getId(), "PASSWORD_RESET", "ZT_USER", user.getId().toString(), null, null);
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest input) {
        ZtAuthUser user = findUser(userId);
        if (!passwordEncoder.matches(input.currentPassword(), user.getPasswordHash())) throw new AuthApiException(
                HttpStatus.BAD_REQUEST, "auth.password.mismatch", "Le mot de passe actuel est incorrect.");
        user.setPasswordHash(passwordEncoder.encode(input.newPassword()));
        audit.record(userId, "PASSWORD_CHANGE", "ZT_USER", userId.toString(), null, null);
    }

    @Transactional
    public void logout(UUID userId, String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokens.findByTokenHash(sha256(rawRefreshToken)).filter(token -> token.getUser().getId().equals(userId))
                    .ifPresent(token -> { token.revoke(); audit.record(userId, "LOGOUT", "ZT_REFRESH_TOKEN", null, null, null); });
        }
        // Nettoyage / Suppression des cookies du navigateur lors de la déconnexion
        clearCookie("accessToken");
        clearCookie("refreshToken");
    }

    public AuthUserDto me(UUID userId) { return pageAccess.getCurrentUser(userId); }

    // --- Gestion centralisée des Cookies sécurisés ---
    private void addCookie(String name, String value, Duration maxAge) {
        ResponseCookie cookie = ResponseCookie.from(name, value)
                .httpOnly(true)
                .secure(true) // Mettre à true en production (si HTTPS activé)
                .path("/") 
                .maxAge(maxAge)
                .sameSite("Lax") // ou "Strict"
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void clearCookie(String name) {
        ResponseCookie cookie = ResponseCookie.from(name, "")
                .httpOnly(true)
                .secure(true)
                .path("/")
                .maxAge(0) // Expire immédiatement pour supprimer le cookie
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private ZtAuthUser findUser(UUID id) {
        return users.findById(id).orElseThrow(() -> new AuthApiException(HttpStatus.UNAUTHORIZED,
                "auth.credentials.invalid", "Session invalide."));
    }
    private String createRefreshToken(ZtAuthUser user) {
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        refreshTokens.save(new ZtRefreshToken(user, sha256(raw), LocalDateTime.now().plusDays(7)));
        return raw;
    }
    private List<String> roles(ZtAuthUser user) {
        try { return objectMapper.readValue(user.getRoleCodes(), objectMapper.getTypeFactory().constructCollectionType(List.class, String.class)); }
        catch (Exception ex) { throw new IllegalStateException("ZT_USER.role_codes invalide", ex); }
    }
    private String write(Object value) {
        try { return objectMapper.writeValueAsString(value); }
        catch (Exception ex) { throw new IllegalStateException(ex); }
    }
    private static String sha256(String value) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (Exception ex) { throw new IllegalStateException(ex); }
    }
    private void checkRateLimit(String ip) {
        AttemptWindow window = failures.get(ip);
        if (window != null && window.startedAt().plusSeconds(600).isAfter(LocalDateTime.now()) && window.count() >= 5)
            throw new AuthApiException(HttpStatus.TOO_MANY_REQUESTS, "auth.too_many_attempts", "Trop de tentatives. Réessayez dans 10 minutes.");
    }
    private void recordFailure(String ip) {
        failures.compute(ip, (key, value) -> value == null || !value.startedAt().plusSeconds(600).isAfter(LocalDateTime.now())
                ? new AttemptWindow(LocalDateTime.now(), 1) : new AttemptWindow(value.startedAt(), value.count() + 1));
    }
    private record AttemptWindow(LocalDateTime startedAt, int count) { }
    @Transactional
public AuthUserDto rotateRefreshToken(String rawRefreshToken) {
    if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
        throw new AuthApiException(HttpStatus.UNAUTHORIZED, "auth.refresh.missing", "Refresh token absent.");
    }

    String hashedToken = sha256(rawRefreshToken);

    // 1. Rechercher le token en base et vérifier s'il est valide / non révoqué / non expiré
    ZtRefreshToken storedToken = refreshTokens.findByTokenHash(hashedToken)
            .orElseThrow(() -> new AuthApiException(HttpStatus.UNAUTHORIZED, "auth.refresh.invalid", "Refresh token invalide."));

    if (storedToken.isRevoked() || !storedToken.getExpiresAt().isAfter(LocalDateTime.now())) {
        throw new AuthApiException(HttpStatus.UNAUTHORIZED, "auth.refresh.expired", "Refresh token expiré ou révoqué.");
    }

    ZtAuthUser user = storedToken.getUser();
    if (!"ACTIVE".equals(user.getStatus())) {
        throw new AuthApiException(HttpStatus.LOCKED, "auth.user.disabled", DISABLED);
    }

    // 2. ROTATION : Révoquer immédiatement l'ancien refresh token pour qu'il ne soit plus jamais réutilisable
    storedToken.revoke();
    refreshTokens.save(storedToken);

    // 3. Générer un nouvel Access Token et un NOUVEAU Refresh Token
    String newAccess = jwt.generate(user.getId(), user.getUsername(), roles(user));
    String newRefresh = createRefreshToken(user); // Crée et sauvegarde le nouveau en base

    // 4. Mettre à jour les cookies HttpOnly dans la réponse HTTP
    addCookie("accessToken", newAccess, Duration.ofSeconds(jwt.getExpiresIn()));
    addCookie("refreshToken", newRefresh, Duration.ofDays(7));

    audit.record(user.getId(), "TOKEN_ROTATE", "ZT_REFRESH_TOKEN", user.getId().toString(), null, null);

    return pageAccess.getCurrentUser(user.getId());
}
}