package com.zt.hub.entity.primary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;

@Entity
@Table(name = "ZT_ROLE_PAGE")
@IdClass(ZtRolePageId.class)
public class ZtRolePage {

    @Id
    @Column(name = "role_code", nullable = false, length = 64)
    private String roleCode;

    @Id
    @Column(name = "page_code", nullable = false, length = 128)
    private String pageCode;

    protected ZtRolePage() {
    }

    public ZtRolePage(String roleCode, String pageCode) {
        this.roleCode = roleCode;
        this.pageCode = pageCode;
    }

    public String getRoleCode() {
        return roleCode;
    }

    public String getPageCode() {
        return pageCode;
    }
}