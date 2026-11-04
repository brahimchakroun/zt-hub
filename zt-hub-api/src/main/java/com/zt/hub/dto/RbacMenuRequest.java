package com.zt.hub.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RbacMenuRequest(

        @NotBlank
        @Size(max = 128)
        @Pattern(regexp = "[a-z0-9]+(?:[.-][a-z0-9]+)*")
        String menuCode,

        @NotBlank
        @Size(max = 128)
        String label,

        @Size(max = 255)
        String urlRoot,

        @Min(0)
        int displayOrder,

        boolean active

) {
}