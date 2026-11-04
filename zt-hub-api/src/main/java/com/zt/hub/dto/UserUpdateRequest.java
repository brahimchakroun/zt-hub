package com.zt.hub.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record UserUpdateRequest(
        @Email(message = "email invalide")
        @Size(max = 128)
        String email,

        @Size(max = 100)
        String firstName,

        @Size(max = 100)
        String lastName,

        Boolean enabled,

        @Size(min = 8, max = 128, message = "password : 8 caracteres minimum")
        String password,

        Set<String> roleCodes
) {
}
