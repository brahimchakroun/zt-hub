package com.zt.hub.entity.primary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ZT_USER")
public class ZtAuthUser {
    @Id
    @UuidGenerator
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "username", nullable = false, unique = true, length = 64)
    private String username;
    @Column(name = "email", nullable = false, unique = true, length = 128)
    private String email;
    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;
    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;
    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;
    @Column(name = "role_codes", nullable = false)
    private String roleCodes;
    @Column(name = "status", nullable = false, length = 16)
    private String status;
    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;
    @Column(name = "last_login_ip", length = 64)
    private String lastLoginIp;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    protected ZtAuthUser() { }
    public ZtAuthUser(String username, String email, String firstName, String lastName,
                      String passwordHash, String roleCodes, String status) {
        this.username = username;
        this.email = email;
        this.firstName = firstName;
        this.lastName = lastName;
        this.passwordHash = passwordHash;
        this.roleCodes = roleCodes;
        this.status = status;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = this.createdAt;
    }
    public UUID getId() { return id; }
    public String getUsername() { return username; }
    public String getEmail() { return email; }
    public String getFirstName() { return firstName; }
    public String getLastName() { return lastName; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; this.updatedAt = LocalDateTime.now(); }
    public String getRoleCodes() { return roleCodes; }
    public void setRoleCodes(String roleCodes) { this.roleCodes = roleCodes; this.updatedAt = LocalDateTime.now(); }
    public String getStatus() { return status; }
    public void setFirstName(String firstName) { this.firstName = firstName; this.updatedAt = LocalDateTime.now(); }
    public void setLastName(String lastName) { this.lastName = lastName; this.updatedAt = LocalDateTime.now(); }
    public void setEmail(String email) { this.email = email; this.updatedAt = LocalDateTime.now(); }
    public void setStatus(String status) { this.status = status; this.updatedAt = LocalDateTime.now(); }
    public void recordLogin(String ip) { this.lastLoginAt = LocalDateTime.now(); this.lastLoginIp = ip; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
