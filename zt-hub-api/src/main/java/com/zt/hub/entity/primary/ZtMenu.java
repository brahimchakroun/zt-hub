package com.zt.hub.entity.primary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "ZT_MENU")
public class ZtMenu {

    @Id
    @Column(name = "menu_code", nullable = false, length = 128)
    private String menuCode;

    @Column(name = "label", nullable = false, length = 128)
    private String label;

    @Column(name = "url_root")
    private String url_root;

    @Column(name = "icon")
    private String icon;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    protected ZtMenu() {
    }

    public ZtMenu(String menuCode, String label) {
        this.menuCode = menuCode;
        this.label = label;
        this.active = true;
    }

    public ZtMenu(String menuCode, String label, String url_root, int displayOrder, boolean active) {
        this.menuCode = menuCode;
        this.label = label;
        this.url_root = url_root;
        this.displayOrder = displayOrder;
        this.active = active;
    }

    public String getUrl_root() {
        return url_root;
    }

    public void setUrl_root(String url_root) {
        this.url_root = url_root;
    }

    public String getIcon() {
        return icon;
    }

    public void setIcon(String icon) {
        this.icon = icon;
    }

    public String getMenuCode() {
        return menuCode;
    }

    public String getLabel() {
        return label;
    }

    public boolean isActive() {
        return active;
    }   
    

    public void setMenuCode(String menuCode) {
        this.menuCode = menuCode;
    }

    public void setLabel(String label) {
        this.label = label;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public int getDisplayOrder() {
        return displayOrder;
    }

    public void setDisplayOrder(int displayOrder) {
        this.displayOrder = displayOrder;
    }

    public void update(String label, String url_root, int displayOrder, boolean active) {
        this.label = label;
        this.url_root = url_root;
        this.displayOrder = displayOrder;
        this.active = active;
    }

    public String getUrlRoot() {
        return url_root;
    }

    public void setUrlRoot(String url_root) {
        this.url_root = url_root;
    }
}