package com.zt.hub.dto;

public record AuthTokenData(String accessToken, String tokenType, long expiresIn,
                            String refreshToken, AuthUserDto user) {
}
