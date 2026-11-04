package com.zt.hub.entity.primary;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "ZT_PAGE")
public class ZtPage {

    @Id
    @Column(name = "page_code", nullable = false, length = 128)
    private String pageCode;

    @Column(name = "label", nullable = false, length = 128)
    private String label;

    @Column(name = "group_name", length = 64)
    private String groupName;

    @Column(name = "icon", length = 64)
    private String icon;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(name = "active", nullable = false)
    private boolean active;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "url_root", length = 500)
    private String url_root;

    @Column(name = "menu_code", length = 128)
    private String menuCode;

   

    protected ZtPage() {
    }

    public ZtPage(String pageCode, String label) {
        this.pageCode = pageCode;
        this.label = label;
        this.active = true;
    }

    public ZtPage(String pageCode, String menuCode,String url_root, String label, String groupName, String icon,
                  int displayOrder, boolean active, String description) {
        this.pageCode = pageCode;
        this.menuCode = menuCode;
        this.url_root = url_root;
        this.label = label;
        this.groupName = groupName;
        this.icon = icon;
        this.displayOrder = displayOrder;
        this.active = active;
        this.description = description;
    }

    public String getPageCode() {
        return pageCode;
    }

    public String getLabel() {
        return label;
    }

    public String getGroupName() { return groupName; }
    public String getIcon() { return icon; }
    public int getDisplayOrder() { return displayOrder; }
    public boolean isActive() { return active; }
    public String getDescription() { return description; }

    public String getUrlRoot() {
        return url_root;
    }

    public void setUrlRoot(String url_root) {
        this.url_root = url_root;
    }

    public String getMenuCode() {
        return menuCode;
    }

    public void setMenuCode(String menuCode) {
        this.menuCode = menuCode;
    }


    public void update(String label,String menuCode,String url_root, String groupName, String icon, int displayOrder,
                       boolean active, String description) {
        this.label = label;
        this.menuCode = menuCode;
        this.url_root = url_root;
        this.groupName = groupName;
        this.icon = icon;
        this.displayOrder = displayOrder;
        this.active = active;
        this.description = description;
    }
}