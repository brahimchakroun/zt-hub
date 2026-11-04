package com.zt.hub.controller;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.zt.hub.security.AuthRsaJwtService;

@RestController 
@RequestMapping ("/api/v1/auth")
public class JwkSetController {

    private final AuthRsaJwtService jwtService;

    public JwkSetController(AuthRsaJwtService jwtService) {
        this.jwtService = jwtService;
    }

}