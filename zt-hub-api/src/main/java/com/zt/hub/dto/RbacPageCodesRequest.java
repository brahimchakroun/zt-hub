package com.zt.hub.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RbacPageCodesRequest(@NotEmpty List<@Size(max = 128) String> pageCodes) {
}