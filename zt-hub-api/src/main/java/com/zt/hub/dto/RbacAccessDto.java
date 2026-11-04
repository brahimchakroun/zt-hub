package com.zt.hub.dto;

import java.util.List;

public record RbacAccessDto(List<String> roleCodes, List<String> pageAccess, List<String> permissions) {
}