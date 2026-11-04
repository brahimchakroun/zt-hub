package com.zt.hub.entity.primary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ZT_ROLE")
public class ZtRole {

    @Id
    @Column(name = "code", nullable = false, length = 64)
    private String code;

    @Column(name = "label", nullable = false, length = 128)
    private String label;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "active", nullable = false)
    private boolean active;

    protected ZtRole() {
    }

    public ZtRole(String code, String label) {
        this.code = code;
        this.label = label;
        this.active = true;
    }

    public ZtRole(String code, String label, String description, int displayOrder, boolean active) {
        this.code = code;
        this.label = label;
        this.description = description;
        this.displayOrder = displayOrder;
        this.active = active;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    public String getDescription() { return description; }
    public int getDisplayOrder() { return displayOrder; }
    public boolean isActive() { return active; }

    public void update(String label, String description, int displayOrder, boolean active) {
        this.label = label;
        this.description = description;
        this.displayOrder = displayOrder;
        this.active = active;
    }
}