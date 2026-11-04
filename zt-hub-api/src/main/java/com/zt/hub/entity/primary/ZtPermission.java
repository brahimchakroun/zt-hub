package com.zt.hub.entity.primary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ZT_PERMISSION")
public class ZtPermission {

    @Id
    @Column(name = "permission_code", nullable = false, length = 128)
    private String permissionCode;

    @Column(name = "label", nullable = false, length = 128)
    private String label;

    @Column(name = "group_name", length = 64)
    private String groupName;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "description", length = 500)
    private String description;

    protected ZtPermission() {
    }

    public String getPermissionCode() { return permissionCode; }
    public String getLabel() { return label; }
    public String getGroupName() { return groupName; }
    public int getDisplayOrder() { return displayOrder; }
    public boolean isActive() { return active; }
    public String getDescription() { return description; }
}