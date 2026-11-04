package com.zt.hub.controller;

import com.zt.hub.dto.*;
import com.zt.hub.security.AuthRsaJwtService;
import com.zt.hub.service.AuthV1Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import java.security.interfaces.RSAPublicKey;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth")
public class AuthV1Controller {
    private final AuthV1Service auth;
    private final AuthRsaJwtService     jwtService;

    @PostMapping("/login")
    @Operation(summary = "Connexion")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@Valid @RequestBody LoginRequest body) {
        return ResponseEntity.ok(ApiResponse.of(auth.login(body)));
    }

    @PostMapping("/register")
    @Operation(summary = "Créer un compte")
    public ResponseEntity<ApiResponse<Map<String, String>>> register(@Valid @RequestBody AuthRegisterRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(auth.register(body)));
    }

    @PostMapping("/forgot-password")
    @Operation(summary = "Demander un lien de réinitialisation")
    public ResponseEntity<ApiResponse<Map<String, String>>> forgot(@Valid @RequestBody ForgotPasswordRequest body) {
        return ResponseEntity.ok(ApiResponse.of(auth.forgotPassword(body)));
    }

    @PostMapping("/reset-password")
    @Operation(summary = "Réinitialiser le mot de passe")
    public ResponseEntity<ApiResponse<Map<String, String>>> reset(@Valid @RequestBody ResetPasswordRequest body) {
        auth.resetPassword(body);
        return ResponseEntity.ok(ApiResponse.of(Map.of("message", "Mot de passe réinitialisé.")));
    }

    @PostMapping("/change-password")
    @Operation(summary = "Modifier son mot de passe")
    public ResponseEntity<ApiResponse<Map<String, String>>> change(@RequestAttribute("authUserId") UUID userId,
            @Valid @RequestBody ChangePasswordRequest body) {
        auth.changePassword(userId, body);
        return ResponseEntity.ok(ApiResponse.of(Map.of("message", "Mot de passe modifié.")));
    }

    @PostMapping("/logout")
    @Operation(summary = "Déconnexion")
    public ResponseEntity<Void> logout(@RequestAttribute("authUserId") UUID userId,
                                       @RequestBody(required = false) LogoutRequest body) {
        auth.logout(userId, body == null ? null : body.refreshToken());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    @Operation(summary = "Utilisateur courant et droits d'accès aux pages")
    public ResponseEntity<ApiResponse<AuthUserDto>> me(@RequestAttribute("authUserId") UUID userId) {
        return ResponseEntity.ok(ApiResponse.of(auth.me(userId)));
    }

    



    @GetMapping("/certs")
    public Map<String, Object> keys() {
        // 1. Récupérer la clé publique RSA depuis votre service AuthRsaJwtService
        RSAPublicKey publicKey = jwtService.getPublicKeyPem(); // Assurez-vous d'avoir un getter pour getPublicKey() dans jwtService
        
        // 2. Construire un objet JWK (JSON Web Key)
        RSAKey rsaKey = new RSAKey.Builder(publicKey)
                .keyID("zt-hub-key-id") // Un identifiant unique pour la clé
                .build();
                
        // 3. Encapsuler dans un JWKSet et le convertir en Map (Spring convertira automatiquement en JSON)
        return new JWKSet(rsaKey).toJSONObject();
    }

  @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthUserDto>> refreshToken(
            @CookieValue(name = "refreshToken", required = false) String rawRefreshToken) {
        
        AuthUserDto userDto = auth.rotateRefreshToken(rawRefreshToken);
        return ResponseEntity.ok(ApiResponse.of(userDto));
    }
}
