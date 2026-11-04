package com.zt.hub.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RbacPageRequest(

        @NotBlank
        @Size(max = 128)
        @Pattern(regexp = "[a-z0-9]+(?:[.-][a-z0-9]+)*")
        String pageCode,

        @NotBlank
        @Size(max = 128)
        String label,

        @Size(max = 64)
        String groupName,

        @Size(max = 64)
        String icon,

        @Min(0)
        int displayOrder,

        boolean active,

        @Size(max = 500)
        String description,

        @NotBlank
        @Size(max = 128)
        String menuCode,

        @Size(max = 500)
        String urlRoot

) {
}