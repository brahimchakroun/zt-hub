package com.zt.hub.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
public class AuthRsaJwtService {
    private final PrivateKey privateKey;
    private final PublicKey publicKey;
    private final long expiresIn;

    public AuthRsaJwtService(@Value("${app.jwt.private-key:}") String privateKeyPem,
                             @Value("${app.jwt.public-key:}") String publicKeyPem,
                             @Value("${app.jwt.access-expiration-seconds:3600}") long expiresIn) {
        this.expiresIn = expiresIn;
        try {
            if (privateKeyPem.isBlank() || publicKeyPem.isBlank()) {
                KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
                generator.initialize(2048);
                KeyPair pair = generator.generateKeyPair();
                this.privateKey = pair.getPrivate();
                this.publicKey = pair.getPublic();
            } else {
                KeyFactory factory = KeyFactory.getInstance("RSA");
                this.privateKey = factory.generatePrivate(new PKCS8EncodedKeySpec(decodePem(privateKeyPem)));
                this.publicKey = factory.generatePublic(new X509EncodedKeySpec(decodePem(publicKeyPem)));
            }
        } catch (Exception ex) {
            throw new IllegalStateException("Clés JWT RSA invalides", ex);
        }
    }

    public String generate(UUID id, String username, List<String> roles) {
        Date now = new Date();
        return Jwts.builder().subject(id.toString()).claim("username", username).claim("roles", roles)
                .issuedAt(now).expiration(new Date(now.getTime() + expiresIn * 1000))
                .signWith(privateKey, Jwts.SIG.RS256).compact();
    }

    public RSAPublicKey getPublicKeyPem() {
        return (RSAPublicKey) publicKey;
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(publicKey).build().parseSignedClaims(token).getPayload();
    }
    public long getExpiresIn() { return expiresIn; }

    private static byte[] decodePem(String pem) {
        String contents = pem.replaceAll("-----BEGIN [^-]+-----", "")
                .replaceAll("-----END [^-]+-----", "").replaceAll("\\s", "");
        return Base64.getDecoder().decode(contents.getBytes(StandardCharsets.US_ASCII));
    }
}
