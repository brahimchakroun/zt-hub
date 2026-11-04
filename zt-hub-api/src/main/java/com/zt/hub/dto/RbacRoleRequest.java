package com.zt.hub.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RbacRoleRequest(
        @NotBlank @Size(max = 64) @Pattern(regexp = "[A-Za-z][A-Za-z0-9_]*") String code,
        @NotBlank @Size(max = 128) String label,
        @Size(max = 500) String description,
        @Min(0) int displayOrder,
        boolean active) {
}