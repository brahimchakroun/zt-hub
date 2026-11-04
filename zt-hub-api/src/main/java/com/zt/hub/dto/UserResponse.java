package com.zt.hub.dto;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zt.hub.entity.primary.ZtAuthUser;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public record UserResponse(
        UUID id,
        String username,
        String email,
        String firstName,
        String lastName,
        String status,
        List<String> roleCodes,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static UserResponse from(ZtAuthUser user) {
        List<String> codes;
        try {
            codes = MAPPER.readValue(user.getRoleCodes(), new TypeReference<>() {});
        } catch (Exception ex) {
            codes = new ArrayList<>();
        }
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getStatus(),
                codes,
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
