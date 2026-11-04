package com.zt.hub.dto;


import java.util.List;

public record RbacMenuDto(
        String menuCode,
        String label,
        String urlRoot,
        int displayOrder,
        boolean active,
        String icon,
        List<RbacPageDto> pages
) {
}