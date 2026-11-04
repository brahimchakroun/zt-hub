package com.zt.hub.dto;

public record LoginResponse(AuthUserDto user, String accessToken) {}