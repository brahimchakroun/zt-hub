package com.zt.hub.exception;

import com.zt.hub.dto.ApiErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
public class AuthApiExceptionHandler {
    @ExceptionHandler(AuthApiException.class)
    public ResponseEntity<ApiErrorResponse> authError(AuthApiException ex, HttpServletRequest request) {
        return ResponseEntity.status(ex.getStatus()).body(ApiErrorResponse.of(ex.getCode(), ex.getMessage(),
                ex.getField(), request.getHeader("X-Trace-Id")));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> validation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        var fieldError = ex.getBindingResult().getFieldErrors().stream().findFirst().orElse(null);
        return ResponseEntity.badRequest().body(ApiErrorResponse.of("validation.invalid",
                fieldError == null ? "Les données fournies sont invalides." : fieldError.getDefaultMessage(),
                fieldError == null ? null : fieldError.getField(), request.getHeader("X-Trace-Id")));
    }
}
