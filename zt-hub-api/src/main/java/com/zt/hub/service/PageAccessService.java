package com.zt.hub.service;

import com.zt.hub.dto.AuthUserDto;
import com.zt.hub.exception.AuthApiException;
import com.zt.hub.repository.primary.ZtAuthUserRepository;
import com.zt.hub.repository.primary.ZtMenuRepository;
import com.zt.hub.repository.primary.ZtPageRepository;
import com.zt.hub.dto.RbacAccessDto;
import com.zt.hub.dto.RbacMenuDto;
import com.zt.hub.dto.RbacPageDto;
import com.zt.hub.entity.primary.ZtAuthUser;
import com.zt.hub.entity.primary.ZtMenu;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class PageAccessService {
    private static final long TTL_SECONDS = 60;
    private final JdbcTemplate jdbcTemplate;
    private final ZtAuthUserRepository userRepository;
    private final ZtPageRepository pageRepository;
    private final ZtMenuRepository menuRepository;
    private final ObjectMapper objectMapper;
    private final Map<String, CachedAccess> cache = new ConcurrentHashMap<>();

    public PageAccessService(JdbcTemplate jdbcTemplate,ZtMenuRepository menuRepository, ZtAuthUserRepository userRepository,
                             ZtPageRepository pageRepository, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.menuRepository = menuRepository;
        this.userRepository = userRepository;
        this.pageRepository = pageRepository;
        this.objectMapper = objectMapper;
    }

    public AuthUserDto getCurrentUser(UUID userId) {
        ZtAuthUser user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthApiException(HttpStatus.UNAUTHORIZED, "auth.credentials.invalid", "Session invalide."));
        List<String> roles;
        try {
            roles = objectMapper.readValue(user.getRoleCodes(), new TypeReference<>() { });
        } catch (Exception ex) {
            throw new IllegalStateException("ZT_USER.role_codes doit contenir un tableau JSON", ex);
        }
        return new AuthUserDto(user.getId(), user.getUsername(), user.getEmail(), user.getFirstName(),
                user.getLastName(), roles, pageAccess(roles));
    }

    public RbacAccessDto getAccess(UUID userId) {
        AuthUserDto currentUser = getCurrentUser(userId);
        CachedAccess access = accessFor(currentUser.roles());
        return new RbacAccessDto(currentUser.roles(), access.pages(), access.permissions());
    }

    public List<RbacPageDto> getAccessiblePages(UUID userId) {
        List<String> pageCodes = getCurrentUser(userId).pageAccess();
        if (pageCodes.isEmpty()) return List.of();
        return pageRepository.findByPageCodeInAndActiveTrueOrderByDisplayOrderAsc(pageCodes).stream()
                .map(page -> new RbacPageDto(page.getPageCode(), page.getMenuCode(), page.getUrlRoot(), page.getLabel(), page.getGroupName(),
                    page.getIcon(), page.getDisplayOrder(), page.isActive(), page.getDescription()))
                .toList();
    }

  /*  
    public List<RbacMenuDto> getAccessibleMenus(UUID userId) {

    List<ZtMenu> activeMenus = menuRepository.findByActiveTrueOrderByDisplayOrderAsc();
    List<String> pageCodes = getCurrentUser(userId).pageAccess();

    if (pageCodes.isEmpty()) {
        return List.of();
    }

    List<RbacPageDto> pages = pageRepository
            .findByPageCodeInAndActiveTrueOrderByDisplayOrderAsc(pageCodes)
            .stream()
            .map(page -> new RbacPageDto(
                    page.getPageCode(),
                    page.getMenuCode(),
                    page.getUrlRoot(),
                    page.getLabel(),
                    page.getGroupName(),
                    page.getIcon(),
                    page.getDisplayOrder(),
                    page.isActive(),
                    page.getDescription()))
            .toList();

        Map<String, List<RbacPageDto>> pagesByMenu = pages.stream()
        .filter(page -> Objects.nonNull(page.menuCode()))
                .collect(Collectors.groupingBy(RbacPageDto::menuCode));

        return pagesByMenu.values()
                .stream()
                .map(menuPages -> {

                    RbacPageDto firstPage = menuPages.get(0);

                    return new RbacMenuDto(
                            firstPage.menuCode(),
                            extractMenuLabel(firstPage.menuCode()), // ou label récupéré depuis ZT_MENU
                            firstPage.urlRoot(),
                            menuPages.stream()
                                    .mapToInt(RbacPageDto::displayOrder)
                                    .min()
                                    .orElse(0),
                            true,
                            firstPage.icon(),
                            menuPages
                    );
                })
                .sorted(Comparator.comparingInt(RbacMenuDto::displayOrder))
                .toList();
}*/

public List<RbacMenuDto> getAccessibleMenus(UUID userId) {

    List<ZtMenu> activeMenus =
            menuRepository.findByActiveTrueOrderByDisplayOrderAsc();

    List<String> pageCodes = getCurrentUser(userId).pageAccess();

    if (pageCodes.isEmpty()) {
        return List.of();
    }

    List<RbacPageDto> pages = pageRepository
            .findByPageCodeInAndActiveTrueOrderByDisplayOrderAsc(pageCodes)
            .stream()
            .map(page -> new RbacPageDto(
                    page.getPageCode(),
                    page.getMenuCode(),
                    page.getUrlRoot(),
                    page.getLabel(),
                    page.getGroupName(),
                    page.getIcon(),
                    page.getDisplayOrder(),
                    page.isActive(),
                    page.getDescription()))
            .toList();

    Map<String, List<RbacPageDto>> pagesByMenu = pages.stream()
            .filter(page -> page.menuCode() != null)
            .collect(Collectors.groupingBy(RbacPageDto::menuCode));

    return activeMenus.stream()
            .map(menu -> new RbacMenuDto(
                    menu.getMenuCode(),
                    menu.getLabel(),
                    menu.getUrlRoot(),
                    menu.getDisplayOrder(),
                    menu.isActive(),
                    menu.getIcon(), // icône du menu
                    pagesByMenu.getOrDefault(menu.getMenuCode(), List.of())
            ))
            .filter(menu -> !menu.pages().isEmpty())
            .toList();
}
        private String extractMenuLabel(String menuCode) {
            return menuRepository.findById(menuCode)
                    .map(ZtMenu::getLabel)
                    .orElse(menuCode);
        }
    public void clearCache() {
        cache.clear();
    }

    private List<String> pageAccess(List<String> roles) {
        return accessFor(roles).pages();
        }

        private CachedAccess accessFor(List<String> roles) {
        String key = String.join(",", roles.stream().sorted().toList());
        CachedAccess cached = cache.get(key);
        if (cached != null && cached.expiresAt().isAfter(Instant.now())) return cached;
        if (roles.isEmpty()) return new CachedAccess(List.of(), List.of(), Instant.now().plusSeconds(TTL_SECONDS));
        String placeholders = String.join(",", java.util.Collections.nCopies(roles.size(), "?"));
        String roleFilter = " IN (" + placeholders + ")";
        List<String> pages = jdbcTemplate.queryForList(
            "SELECT DISTINCT rp.page_code FROM ZT_ROLE_PAGE rp " +
                "JOIN ZT_PAGE p ON p.page_code = rp.page_code " +
                "JOIN ZT_ROLE r ON r.code = rp.role_code " +
                "WHERE rp.role_code" + roleFilter + " AND p.active = 1 AND r.active = 1 ORDER BY rp.page_code",
                String.class, roles.toArray());
        List<String> permissions = jdbcTemplate.queryForList(
            "SELECT DISTINCT rp.permission_code FROM ZT_ROLE_PERMISSION rp " +
                "JOIN ZT_PERMISSION p ON p.permission_code = rp.permission_code " +
                "JOIN ZT_ROLE r ON r.code = rp.role_code " +
                "WHERE rp.role_code" + roleFilter + " AND p.active = 1 AND r.active = 1 ORDER BY rp.permission_code",
            String.class, roles.toArray());
        CachedAccess access = new CachedAccess(List.copyOf(new ArrayList<>(pages)),
            List.copyOf(new ArrayList<>(permissions)), Instant.now().plusSeconds(TTL_SECONDS));
        cache.put(key, access);
        return access;
    }

        private record CachedAccess(List<String> pages, List<String> permissions, Instant expiresAt) { }
}
