package com.zt.hub.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Filtre d'authentification stateless : valide le JWT (depuis le cookie HttpOnly ou l'en-tête) et peuple le SecurityContext.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    public static final String AUTHORIZATION_HEADER = "Authorization";
    public static final String BEARER_PREFIX = "Bearer ";
    public static final String ACCESS_TOKEN_COOKIE_NAME = "accessToken";

    private final JwtService jwtService;
    private final AuthRsaJwtService authRsaJwtService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String token = null;

        // 1. Tenter de récupérer le token depuis le cookie HttpOnly "accessToken"
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if (ACCESS_TOKEN_COOKIE_NAME.equals(cookie.getName())) {
                    token = cookie.getValue();
                    break;
                }
            }
        }

        // 2. Fallback optionnel : si aucun cookie n'est trouvé, vérifier l'en-tête Authorization classique
        if (token == null || token.isBlank()) {
            String header = request.getHeader(AUTHORIZATION_HEADER);
            if (header != null && header.startsWith(BEARER_PREFIX)) {
                token = header.substring(BEARER_PREFIX.length());
            }
        }

        // 3. Valider et authentifier si un token valide est trouvé
        if (token != null && !token.isBlank()
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            try {
                var claims = authRsaJwtService.parse(token);
                String username = claims.get("username", String.class);
                List<String> roles = claims.get("roles", List.class);
                List<SimpleGrantedAuthority> authorities = roles.stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role)).toList();
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(claims.getSubject(), null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                request.setAttribute("authUserId", java.util.UUID.fromString(claims.getSubject()));
            } catch (Exception ignored) {
                // Les routes historiques continuent d'accepter leurs JWT HMAC existants.
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null && jwtService.isTokenValid(token)
                    && JwtService.TYPE_ACCESS.equals(jwtService.extractType(token))) {
                String username = jwtService.extractUsername(token);
                List<SimpleGrantedAuthority> authorities = jwtService.extractRoles(token).stream()
                        .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                        .toList();

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(username, null, authorities);
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }

        filterChain.doFilter(request, response);
    }
}