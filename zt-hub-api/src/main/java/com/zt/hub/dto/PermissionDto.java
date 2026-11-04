package com.zt.hub.dto;

public record PermissionDto(
        String permissionCode,
        String label,
        String groupName,
        int displayOrder,
        boolean active,
        String description
) {
}
