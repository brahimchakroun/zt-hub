package com.zt.hub.controller;

import com.zt.hub.dto.ApiResponse;
import com.zt.hub.dto.PermissionDto;
import com.zt.hub.dto.RbacPageCodesRequest;
import com.zt.hub.dto.RbacPageDto;
import com.zt.hub.dto.RbacPageRequest;
import com.zt.hub.dto.RbacRoleCodesRequest;
import com.zt.hub.dto.RbacRoleDto;
import com.zt.hub.dto.RbacRoleRequest;
import com.zt.hub.dto.UserCreateRequest;
import com.zt.hub.dto.UserResponse;
import com.zt.hub.dto.UserUpdateRequest;
import com.zt.hub.service.RbacAdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rbac")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class RbacAdminController {

    private final RbacAdminService rbac;

    @GetMapping("/roles")
    public ApiResponse<List<RbacRoleDto>> listRoles() {
        return ApiResponse.of(rbac.listRoles());
    }

    @GetMapping("/roles/{roleCode}")
    public ApiResponse<RbacRoleDto> getRole(@PathVariable String roleCode) {
        return ApiResponse.of(rbac.getRole(roleCode));
    }

    @PostMapping("/roles")
    public ResponseEntity<ApiResponse<RbacRoleDto>> createRole(@Valid @RequestBody RbacRoleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(rbac.createRole(request)));
    }

    @PutMapping("/roles/{roleCode}")
    public ApiResponse<RbacRoleDto> updateRole(@PathVariable String roleCode,
                                                @Valid @RequestBody RbacRoleRequest request) {
        return ApiResponse.of(rbac.updateRole(roleCode, request));
    }

    @DeleteMapping("/roles/{roleCode}")
    public ResponseEntity<Void> deleteRole(@PathVariable String roleCode) {
        rbac.deleteRole(roleCode);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/pages")
    public ApiResponse<List<RbacPageDto>> listPages() {
        return ApiResponse.of(rbac.listPages());
    }
    

    @GetMapping("/pages/{pageCode}")
    public ApiResponse<RbacPageDto> getPage(@PathVariable String pageCode) {
        return ApiResponse.of(rbac.getPage(pageCode));
    }

    @PostMapping("/pages")
    public ResponseEntity<ApiResponse<RbacPageDto>> createPage(@Valid @RequestBody RbacPageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(rbac.createPage(request)));
    }

    @PutMapping("/pages/{pageCode}")
    public ApiResponse<RbacPageDto> updatePage(@PathVariable String pageCode,
                                                @Valid @RequestBody RbacPageRequest request) {
        return ApiResponse.of(rbac.updatePage(pageCode, request));
    }

    @DeleteMapping("/pages/{pageCode}")
    public ResponseEntity<Void> deletePage(@PathVariable String pageCode) {
        rbac.deletePage(pageCode);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/users/{userId}/roles")
    public ApiResponse<List<String>> getUserRoles(@PathVariable UUID userId) {
        return ApiResponse.of(rbac.getUserRoles(userId));
    }

    @PutMapping("/users/{userId}/roles")
    public ApiResponse<List<String>> replaceUserRoles(@PathVariable UUID userId,
                                                       @Valid @RequestBody RbacRoleCodesRequest request) {
        return ApiResponse.of(rbac.replaceUserRoles(userId, request.roleCodes()));
    }

    @PostMapping("/users/{userId}/roles/{roleCode}")
    public ApiResponse<List<String>> addUserRole(@PathVariable UUID userId, @PathVariable String roleCode) {
        return ApiResponse.of(rbac.addUserRole(userId, roleCode));
    }

    @DeleteMapping("/users/{userId}/roles/{roleCode}")
    public ApiResponse<List<String>> removeUserRole(@PathVariable UUID userId, @PathVariable String roleCode) {
        return ApiResponse.of(rbac.removeUserRole(userId, roleCode));
    }

    @GetMapping("/roles/{roleCode}/pages")
    public ApiResponse<List<String>> getRolePages(@PathVariable String roleCode) {
        return ApiResponse.of(rbac.getRolePages(roleCode));
    }

    @PutMapping("/roles/{roleCode}/pages")
    public ApiResponse<List<String>> replaceRolePages(@PathVariable String roleCode,
                                                       @Valid @RequestBody RbacPageCodesRequest request) {
        return ApiResponse.of(rbac.replaceRolePages(roleCode, request.pageCodes()));
    }

    @PostMapping("/roles/{roleCode}/pages/{pageCode}")
    public ApiResponse<List<String>> addRolePage(@PathVariable String roleCode, @PathVariable String pageCode) {
        return ApiResponse.of(rbac.addRolePage(roleCode, pageCode));
    }

    @DeleteMapping("/roles/{roleCode}/pages/{pageCode}")
    public ApiResponse<List<String>> removeRolePage(@PathVariable String roleCode, @PathVariable String pageCode) {
        return ApiResponse.of(rbac.removeRolePage(roleCode, pageCode));
    }

    // ========================================================================
    // Users CRUD
    // ========================================================================

    @GetMapping("/users")
    public ApiResponse<List<UserResponse>> listUsers() {
        return ApiResponse.of(rbac.listUsers());
    }

    @GetMapping("/users/{userId}")
    public ApiResponse<UserResponse> getUser(@PathVariable UUID userId) {
        return ApiResponse.of(rbac.getUser(userId));
    }

    @PostMapping("/users")
    public ResponseEntity<ApiResponse<UserResponse>> createUser(@Valid @RequestBody UserCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.of(rbac.createUser(request)));
    }

    @PutMapping("/users/{userId}")
    public ApiResponse<UserResponse> updateUser(@PathVariable UUID userId,
                                                 @Valid @RequestBody UserUpdateRequest request) {
        return ApiResponse.of(rbac.updateUser(userId, request));
    }

    @DeleteMapping("/users/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable UUID userId) {
        rbac.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }

    // ========================================================================
    // Permissions (lecture seule)
    // ========================================================================

    @GetMapping("/permissions")
    public ApiResponse<List<PermissionDto>> listPermissions() {
        return ApiResponse.of(rbac.listPermissions());
    }
}