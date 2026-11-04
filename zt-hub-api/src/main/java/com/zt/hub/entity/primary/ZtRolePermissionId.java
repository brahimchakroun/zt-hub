package com.zt.hub.entity.primary;

import java.io.Serializable;
import java.util.Objects;

public class ZtRolePermissionId implements Serializable {
    private String roleCode;
    private String permissionCode;

    public ZtRolePermissionId() {
    }

    public ZtRolePermissionId(String roleCode, String permissionCode) {
        this.roleCode = roleCode;
        this.permissionCode = permissionCode;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ZtRolePermissionId that)) return false;
        return Objects.equals(roleCode, that.roleCode) && Objects.equals(permissionCode, that.permissionCode);
    }

    @Override
    public int hashCode() {
        return Objects.hash(roleCode, permissionCode);
    }
}