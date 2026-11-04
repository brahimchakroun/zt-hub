package com.zt.hub.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RbacRoleCodesRequest(
        @NotEmpty List<@Size(max = 64) @Pattern(regexp = "[A-Za-z][A-Za-z0-9_]*") String> roleCodes) {
}