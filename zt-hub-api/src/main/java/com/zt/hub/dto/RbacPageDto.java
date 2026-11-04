package com.zt.hub.dto;

public record RbacPageDto(String pageCode,String menuCode,String urlRoot, String label, String groupName, String icon,
                          int displayOrder, boolean active, String description) {
}