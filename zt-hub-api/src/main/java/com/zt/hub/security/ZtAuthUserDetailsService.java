package com.zt.hub.security;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zt.hub.repository.primary.ZtAuthUserRepository;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

@Service
public class ZtAuthUserDetailsService implements UserDetailsService {

    private final ZtAuthUserRepository users;
    private final ObjectMapper objectMapper;

    public ZtAuthUserDetailsService(ZtAuthUserRepository users, ObjectMapper objectMapper) {
        this.users = users;
        this.objectMapper = objectMapper;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String normalizedUsername = username.trim().toLowerCase(Locale.ROOT);
        var user = users.findByUsername(normalizedUsername)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable"));

        try {
            List<String> roleCodes = objectMapper.readValue(user.getRoleCodes(), new TypeReference<>() { });
            return User.withUsername(user.getUsername())
                    .password(user.getPasswordHash())
                    .authorities(roleCodes.stream()
                            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                            .toList())
                    .disabled(!"ACTIVE".equals(user.getStatus()))
                    .build();
        } catch (Exception ex) {
            throw new IllegalStateException("ZT_USER.role_codes doit contenir un tableau JSON", ex);
        }
    }
}