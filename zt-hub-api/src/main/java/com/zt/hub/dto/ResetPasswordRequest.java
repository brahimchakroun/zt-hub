package com.zt.hub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(@NotBlank String resetToken,
                                   @NotBlank @Size(min = 6, max = 100) String newPassword) {
}
