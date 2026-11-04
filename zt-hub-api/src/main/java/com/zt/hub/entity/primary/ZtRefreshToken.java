package com.zt.hub.entity.primary;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ZT_REFRESH_TOKEN")
public class ZtRefreshToken {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY) 
    @JoinColumn(name = "user_id", nullable = false)
    private ZtAuthUser user;
    
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;
    
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected ZtRefreshToken() { }
    
    public ZtRefreshToken(ZtAuthUser user, String tokenHash, LocalDateTime expiresAt) {
        this.user = user; 
        this.tokenHash = tokenHash; 
        this.expiresAt = expiresAt;
        this.createdAt = LocalDateTime.now();
    }

    public ZtAuthUser getUser() { return user; }
    public String getTokenHash() { return tokenHash; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public LocalDateTime getRevokedAt() { return revokedAt; }

    // Indique si le token a été révoqué (si la date 'revokedAt' n'est pas nulle)
    public boolean isRevoked() {
        return this.revokedAt != null;
    }

    // Permet de marquer le token comme révoqué
    public void revoke() { 
        this.revokedAt = LocalDateTime.now(); 
    }
}