package com.zt.hub.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.Set;

public record UserCreateRequest(
        @NotBlank(message = "username est obligatoire")
        @Size(min = 3, max = 64)
        String username,

        @NotBlank(message = "email est obligatoire")
        @Email(message = "email invalide")
        @Size(max = 128)
        String email,

        @NotBlank(message = "password est obligatoire")
        @Size(min = 8, max = 128, message = "password : 8 caracteres minimum")
        String password,

        @NotBlank(message = "firstName est obligatoire")
        @Size(max = 100)
        String firstName,

        @NotBlank(message = "lastName est obligatoire")
        @Size(max = 100)
        String lastName,

        Boolean enabled,

        Set<@NotBlank String> roleCodes
) {
}
