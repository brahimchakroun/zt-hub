package com.zt.hub.entity.primary;

import java.io.Serializable;
import java.util.Objects;

public class ZtRolePageId implements Serializable {
    private String roleCode;
    private String pageCode;

    public ZtRolePageId() {
    }

    public ZtRolePageId(String roleCode, String pageCode) {
        this.roleCode = roleCode;
        this.pageCode = pageCode;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof ZtRolePageId that)) return false;
        return Objects.equals(roleCode, that.roleCode) && Objects.equals(pageCode, that.pageCode);
    }

    @Override
    public int hashCode() {
        return Objects.hash(roleCode, pageCode);
    }
}