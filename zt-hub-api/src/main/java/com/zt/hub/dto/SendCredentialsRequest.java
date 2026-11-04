package com.zt.hub.dto;



import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SendCredentialsRequest {
    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String username;

    @NotBlank
    private String password;

    private String subject = "Vos identifiants de connexion - Zitouna Takaful";
}