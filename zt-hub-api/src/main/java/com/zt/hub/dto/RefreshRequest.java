package com.zt.hub.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(
        @NotBlank(message = "refreshToken est obligatoire") String refreshToken
) {
}
