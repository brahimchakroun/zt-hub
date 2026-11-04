package com.zt.hub.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RoleRequest(
        @NotBlank(message = "code est obligatoire")
        @Pattern(regexp = "^[A-Z][A-Z0-9_]{1,31}$", message = "code doit etre en MAJUSCULES (ex : ADMIN)")
        String code,

        @NotBlank(message = "label est obligatoire")
        @Size(max = 128)
        String label
) {
}
