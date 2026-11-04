package com.zt.hub.entity.primary;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ZT_PASSWORD_RESET")
public class ZtPasswordReset {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id", nullable = false)
    private ZtAuthUser user;
    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;
    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;
    @Column(name = "ip", length = 64)
    private String ip;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    protected ZtPasswordReset() { }
    public ZtPasswordReset(ZtAuthUser user, String tokenHash, LocalDateTime expiresAt, String ip) {
        this.user = user; this.tokenHash = tokenHash; this.expiresAt = expiresAt;
        this.ip = ip; this.createdAt = LocalDateTime.now();
    }
    public Long getId() { return id; }
    public ZtAuthUser getUser() { return user; }
    public String getTokenHash() { return tokenHash; }
    public LocalDateTime getExpiresAt() { return expiresAt; }
    public LocalDateTime getConsumedAt() { return consumedAt; }
    public void consume() { this.consumedAt = LocalDateTime.now(); }
}
