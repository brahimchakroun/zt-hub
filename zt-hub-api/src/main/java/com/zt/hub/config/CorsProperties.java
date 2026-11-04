package com.zt.hub.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.cors")
public class CorsProperties {

    /** Whitelist d'origines autorisees (externalisee dans application.yml). */
    private List<String> allowedOrigins = new ArrayList<>();
}
