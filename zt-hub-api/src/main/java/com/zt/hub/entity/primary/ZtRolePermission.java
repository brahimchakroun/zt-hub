package com.zt.hub.entity.primary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

@Entity
@Table(name = "ZT_ROLE_PERMISSION")
@IdClass(ZtRolePermissionId.class)
public class ZtRolePermission {

    @Id
    @Column(name = "role_code", nullable = false, length = 64)
    private String roleCode;

    @Id
    @Column(name = "permission_code", nullable = false, length = 128)
    private String permissionCode;

    protected ZtRolePermission() {
    }

    public ZtRolePermission(String roleCode, String permissionCode) {
        this.roleCode = roleCode;
        this.permissionCode = permissionCode;
    }

    public String getRoleCode() { return roleCode; }
    public String getPermissionCode() { return permissionCode; }
}