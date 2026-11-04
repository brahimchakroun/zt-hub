package com.zt.hub.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorResponse(boolean ok, Error error) {
    public record Error(String code, String message, String field, String traceId) { }
    public static ApiErrorResponse of(String code, String message, String field, String traceId) {
        return new ApiErrorResponse(false, new Error(code, message, field, traceId));
    }
}
