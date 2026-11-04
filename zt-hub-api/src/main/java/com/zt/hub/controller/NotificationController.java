package com.zt.hub.controller;

import com.zt.hub.dto.SendCredentialsRequest;

import com.zt.hub.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @PostMapping("/send-credentials")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')") // adapte selon tes rôles
    public ResponseEntity<Void> sendCredentials(@Valid @RequestBody SendCredentialsRequest request) {
        notificationService.sendCredentials(request);
        return ResponseEntity.accepted().build(); // 202 Accepted (car asynchrone)
    }
}