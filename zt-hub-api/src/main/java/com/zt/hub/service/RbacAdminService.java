package com.zt.hub.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zt.hub.dto.*;
import com.zt.hub.entity.primary.ZtAuthUser;
import com.zt.hub.entity.primary.ZtMenu;
import com.zt.hub.entity.primary.ZtPage;
import com.zt.hub.entity.primary.ZtPermission;
import com.zt.hub.entity.primary.ZtRole;
import com.zt.hub.entity.primary.ZtRolePage;
import com.zt.hub.exception.AuthApiException;
import com.zt.hub.repository.primary.ZtAuthUserRepository;
import com.zt.hub.repository.primary.ZtMenuRepository;
import com.zt.hub.repository.primary.ZtPageRepository;
import com.zt.hub.repository.primary.ZtPermissionRepository;
import com.zt.hub.repository.primary.ZtRolePageRepository;
import com.zt.hub.repository.primary.ZtRolePermissionRepository;
import com.zt.hub.repository.primary.ZtRoleRepository;

import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class RbacAdminService {

    private final ZtRoleRepository roles;
    private final ZtPageRepository pages;
    private final ZtPermissionRepository permissions;
    private final ZtRolePageRepository rolePages;
    private final ZtRolePermissionRepository rolePermissions;
    private final ZtAuthUserRepository users;
    private final ObjectMapper objectMapper;
    private final PageAccessService pageAccessService;
    private final PasswordEncoder passwordEncoder;
    private final ZtMenuRepository menus;

    public RbacAdminService(ZtRoleRepository roles, ZtPageRepository pages, ZtPermissionRepository permissions,
                            ZtRolePageRepository rolePages, ZtRolePermissionRepository rolePermissions,
                            ZtAuthUserRepository users, ObjectMapper objectMapper,
                            PageAccessService pageAccessService, PasswordEncoder passwordEncoder, ZtMenuRepository menus) {
        this.roles = roles;
        this.pages = pages;
        this.permissions = permissions;
        this.rolePages = rolePages;
        this.rolePermissions = rolePermissions;
        this.users = users;
        this.objectMapper = objectMapper;
        this.pageAccessService = pageAccessService;
        this.passwordEncoder = passwordEncoder;
        this.menus = menus;
    }

    @Transactional(readOnly = true)
    public List<RbacRoleDto> listRoles() {
        return roles.findAll(Sort.by("displayOrder").ascending().and(Sort.by("code")))
                .stream().map(this::toRoleDto).toList();
    }

    @Transactional(readOnly = true)
    public RbacRoleDto getRole(String roleCode) {
        return toRoleDto(requireRole(normalizeRoleCode(roleCode)));
    }

    @Transactional
    public RbacRoleDto createRole(RbacRoleRequest request) {
        String code = normalizeRoleCode(request.code());
        if (roles.existsById(code)) throw conflict("rbac.role.duplicate", "Ce rôle existe déjà.");
        return toRoleDto(roles.save(new ZtRole(code, request.label().trim(), trimToNull(request.description()),
                request.displayOrder(), request.active())));
    }

    @Transactional
    public RbacRoleDto updateRole(String roleCode, RbacRoleRequest request) {
        String code = normalizeRoleCode(roleCode);
        if (!code.equals(normalizeRoleCode(request.code()))) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "rbac.role.code.immutable", "Le code du rôle ne peut pas être modifié.", "code");
        }
        ZtRole role = requireRole(code);
        role.update(request.label().trim(), trimToNull(request.description()), request.displayOrder(), request.active());
        pageAccessService.clearCache();
        return toRoleDto(role);
    }

    @Transactional
    public void deleteRole(String roleCode) {
        String code = normalizeRoleCode(roleCode);
        ZtRole role = requireRole(code);
        for (ZtAuthUser user : users.findAll()) {
            List<String> userRoles = readRoleCodes(user);
            if (userRoles.contains(code) && userRoles.size() == 1) {
                throw conflict("rbac.role.in_use", "Impossible de supprimer le seul rôle attribué à un utilisateur.");
            }
            if (userRoles.remove(code)) user.setRoleCodes(writeRoleCodes(userRoles));
        }
        rolePages.deleteByRoleCode(code);
        rolePermissions.deleteByRoleCode(code);
        roles.delete(role);
        pageAccessService.clearCache();
    }

    @Transactional(readOnly = true)
    public List<RbacPageDto> listPages() {
        return pages.findAll(Sort.by("displayOrder").ascending().and(Sort.by("pageCode")))
                .stream().map(this::toPageDto).toList();
    }

   

    @Transactional(readOnly = true)
    public RbacPageDto getPage(String pageCode) {
        return toPageDto(requirePage(normalizePageCode(pageCode)));
    }

    @Transactional
    public RbacPageDto createPage(RbacPageRequest request) {
        String code = normalizePageCode(request.pageCode());
        String menuCode = normalizeMenuCode(request.menuCode());

        requireMenu(menuCode);
        if (pages.existsById(code)) throw conflict("rbac.page.duplicate", "Cette page existe déjà.");
        return toPageDto(pages.save(new ZtPage(code, menuCode,request.urlRoot().trim(), request.label().trim(), trimToNull(request.groupName()),
                trimToNull(request.icon()), request.displayOrder(), request.active(), trimToNull(request.description()))));
    }

    @Transactional
    public RbacPageDto updatePage(String pageCode, RbacPageRequest request) {
        String code = normalizePageCode(pageCode);
        String menuCode = normalizeMenuCode(request.menuCode());

        requireMenu(menuCode);
        if (!code.equals(normalizePageCode(request.pageCode()))) {
            throw new AuthApiException(HttpStatus.BAD_REQUEST, "rbac.page.code.immutable", "Le code de la page ne peut pas être modifié.", "pageCode");
        }
        ZtPage page = requirePage(code);
        page.update(request.label().trim(), menuCode, request.urlRoot().trim(), trimToNull(request.groupName()), trimToNull(request.icon()),
                request.displayOrder(), request.active(), trimToNull(request.description()));
        pageAccessService.clearCache();
        return toPageDto(page);
    }

    @Transactional
    public void deletePage(String pageCode) {
        String code = normalizePageCode(pageCode);
        ZtPage page = requirePage(code);
        rolePages.deleteByPageCode(code);
        pages.delete(page);
        pageAccessService.clearCache();
    }

    @Transactional(readOnly = true)
    public List<String> getUserRoles(UUID userId) {
        return readRoleCodes(requireUser(userId));
    }

    @Transactional
    public List<String> replaceUserRoles(UUID userId, List<String> requestedCodes) {
        ZtAuthUser user = requireUser(userId);
        List<String> codes = normalizeAndValidateRoles(requestedCodes);
        user.setRoleCodes(writeRoleCodes(codes));
        pageAccessService.clearCache();
        return codes;
    }

    @Transactional
    public List<String> addUserRole(UUID userId, String roleCode) {
        ZtAuthUser user = requireUser(userId);
        String code = normalizeRoleCode(roleCode);
        requireActiveRole(code);
        List<String> codes = readRoleCodes(user);
        if (!codes.contains(code)) codes.add(code);
        user.setRoleCodes(writeRoleCodes(codes));
        pageAccessService.clearCache();
        return codes;
    }

    @Transactional
    public List<String> removeUserRole(UUID userId, String roleCode) {
        ZtAuthUser user = requireUser(userId);
        String code = normalizeRoleCode(roleCode);
        List<String> codes = readRoleCodes(user);
        if (codes.contains(code) && codes.size() == 1) {
            throw conflict("rbac.user.last_role", "Un utilisateur doit conserver au moins un rôle.");
        }
        codes.remove(code);
        user.setRoleCodes(writeRoleCodes(codes));
        pageAccessService.clearCache();
        return codes;
    }

    @Transactional(readOnly = true)
    public List<String> getRolePages(String roleCode) {
        String code = normalizeRoleCode(roleCode);
        requireRole(code);
        return rolePages.findByRoleCodeOrderByPageCode(code).stream().map(ZtRolePage::getPageCode).toList();
    }

    @Transactional
    public List<String> replaceRolePages(String roleCode, List<String> pageCodes) {
        String code = normalizeRoleCode(roleCode);
        requireRole(code);
        List<String> normalized = pageCodes.stream().map(this::normalizePageCode).distinct().sorted().toList();
        normalized.forEach(this::requirePage);
        rolePages.deleteByRoleCode(code);
        rolePages.saveAll(normalized.stream().map(pageCode -> new ZtRolePage(code, pageCode)).toList());
        pageAccessService.clearCache();
        return normalized;
    }

    @Transactional
    public List<String> addRolePage(String roleCode, String pageCode) {
        String role = normalizeRoleCode(roleCode);
        String page = normalizePageCode(pageCode);
        requireRole(role);
        requirePage(page);
        var id = new com.zt.hub.entity.primary.ZtRolePageId(role, page);
        if (!rolePages.existsById(id)) rolePages.save(new ZtRolePage(role, page));
        pageAccessService.clearCache();
        return getRolePages(role);
    }

    @Transactional
    public List<String> removeRolePage(String roleCode, String pageCode) {
        String role = normalizeRoleCode(roleCode);
        String page = normalizePageCode(pageCode);
        requireRole(role);
        requirePage(page);
        rolePages.deleteById(new com.zt.hub.entity.primary.ZtRolePageId(role, page));
        pageAccessService.clearCache();
        return getRolePages(role);
    }

    // ========================================================================
    // Users CRUD
    // ========================================================================

    @Transactional(readOnly = true)
    public List<UserResponse> listUsers() {
        return users.findAll(Sort.by("createdAt").descending())
                .stream().map(UserResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public UserResponse getUser(UUID userId) {
        return UserResponse.from(requireUser(userId));
    }

    @Transactional
    public UserResponse createUser(UserCreateRequest request) {
        String username = request.username().trim().toLowerCase();
        String email = request.email().trim().toLowerCase();
        if (users.existsByUsername(username)) {
            throw conflict("rbac.user.username.duplicate", "Ce nom d'utilisateur existe déjà.");
        }
        if (users.existsByEmail(email)) {
            throw conflict("rbac.user.email.duplicate", "Cette adresse email existe déjà.");
        }
        List<String> codes = normalizeAndValidateRoles(new ArrayList<>(request.roleCodes()));
        String status = Boolean.FALSE.equals(request.enabled()) ? "INACTIVE" : "ACTIVE";
        ZtAuthUser saved = users.save(new ZtAuthUser(
                username,
                email,
                request.firstName().trim(),
                request.lastName().trim(),
                passwordEncoder.encode(request.password()),
                writeRoleCodes(codes),
                status
        ));
        pageAccessService.clearCache();
        return UserResponse.from(saved);
    }

    @Transactional
    public UserResponse updateUser(UUID userId, UserUpdateRequest request) {
        ZtAuthUser user = requireUser(userId);
        if (request.email() != null && !request.email().isBlank()) {
            String email = request.email().trim().toLowerCase();
            if (!email.equalsIgnoreCase(user.getEmail()) && users.existsByEmail(email)) {
                throw conflict("rbac.user.email.duplicate", "Cette adresse email existe déjà.");
            }
            user.setEmail(email);
        }
        if (request.firstName() != null && !request.firstName().isBlank()) {
            user.setFirstName(request.firstName().trim());
        }
        if (request.lastName() != null && !request.lastName().isBlank()) {
            user.setLastName(request.lastName().trim());
        }
        if (request.enabled() != null) {
            user.setStatus(Boolean.TRUE.equals(request.enabled()) ? "ACTIVE" : "INACTIVE");
        }
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        if (request.roleCodes() != null) {
            List<String> codes = normalizeAndValidateRoles(new ArrayList<>(request.roleCodes()));
            user.setRoleCodes(writeRoleCodes(codes));
        }
        pageAccessService.clearCache();
        return UserResponse.from(user);
    }

    @Transactional
    public void deleteUser(UUID userId) {
        ZtAuthUser user = requireUser(userId);
        List<String> codes = readRoleCodes(user);
        if (codes.contains("ADMIN")) {
            long adminCount = users.findAll().stream()
                    .filter(u -> readRoleCodes(u).contains("ADMIN") && "ACTIVE".equals(u.getStatus()))
                    .count();
            if (adminCount <= 1) {
                throw conflict("rbac.user.last_admin", "Impossible de supprimer le dernier administrateur actif.");
            }
        }
        users.delete(user);
        pageAccessService.clearCache();
    }

    // ========================================================================
    // Permissions list (lecture seule)
    // ========================================================================

    @Transactional(readOnly = true)
    public List<PermissionDto> listPermissions() {
        return permissions.findAll(Sort.by("groupName").ascending().and(Sort.by("displayOrder").ascending()))
                .stream().map(this::toPermissionDto).toList();
    }

    private PermissionDto toPermissionDto(ZtPermission p) {
        return new PermissionDto(
                p.getPermissionCode(),
                p.getLabel(),
                p.getGroupName(),
                p.getDisplayOrder(),
                p.isActive(),
                p.getDescription()
        );
    }

    private List<String> normalizeAndValidateRoles(List<String> requestedCodes) {
        List<String> codes = requestedCodes.stream().map(this::normalizeRoleCode).distinct().sorted().toList();
        codes.forEach(this::requireActiveRole);
        return codes;
    }

    private void requireActiveRole(String code) {
        ZtRole role = requireRole(code);
        if (!role.isActive()) throw conflict("rbac.role.inactive", "Le rôle demandé est désactivé.");
    }

    private String normalizeMenuCode(String code) {
    return code.trim().toLowerCase(Locale.ROOT);
}
    private ZtMenu requireMenu(String code) {
    return menus.findById(code)
            .orElseThrow(() ->
                    notFound(
                            "rbac.menu.not_found",
                            "Menu introuvable."
                    ));
        }

    private ZtRole requireRole(String code) {
        return roles.findById(code).orElseThrow(() -> notFound("rbac.role.not_found", "Rôle introuvable."));
    }

    private ZtPage requirePage(String code) {
        return pages.findById(code).orElseThrow(() -> notFound("rbac.page.not_found", "Page introuvable."));
    }

    private ZtAuthUser requireUser(UUID userId) {
        return users.findById(userId).orElseThrow(() -> notFound("rbac.user.not_found", "Utilisateur introuvable."));
    }

    private List<String> readRoleCodes(ZtAuthUser user) {
        try {
            return new ArrayList<>(objectMapper.readValue(user.getRoleCodes(), new TypeReference<>() { }));
        } catch (Exception ex) {
            throw new IllegalStateException("ZT_USER.role_codes doit contenir un tableau JSON", ex);
        }
    }

    private String writeRoleCodes(List<String> roleCodes) {
        try {
            return objectMapper.writeValueAsString(roleCodes);
        } catch (Exception ex) {
            throw new IllegalStateException("Impossible d'encoder les rôles utilisateur", ex);
        }
    }

    private RbacRoleDto toRoleDto(ZtRole role) {
        return new RbacRoleDto(role.getCode(), role.getLabel(), role.getDescription(), role.getDisplayOrder(), role.isActive());
    }

    private RbacPageDto toPageDto(ZtPage page) {
        return new RbacPageDto(page.getPageCode(), page.getMenuCode(), page.getUrlRoot(), page.getLabel(), page.getGroupName(), page.getIcon(),
            page.getDisplayOrder(), page.isActive(), page.getDescription());
    }

    private String normalizeRoleCode(String code) {
        return code.trim().toUpperCase(Locale.ROOT);
    }

    private String normalizePageCode(String code) {
        return code.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) return null;
        return value.trim();
    }

    private AuthApiException notFound(String code, String message) {
        return new AuthApiException(HttpStatus.NOT_FOUND, code, message);
    }

    private AuthApiException conflict(String code, String message) {
        return new AuthApiException(HttpStatus.CONFLICT, code, message);
    }
}