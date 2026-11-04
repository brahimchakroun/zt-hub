package com.zt.hub.dto;

import java.util.List;
import java.util.UUID;

public record AuthUserDto(UUID id, String username, String email, String firstName,
                          String lastName, List<String> roles, List<String> pageAccess) {
}
