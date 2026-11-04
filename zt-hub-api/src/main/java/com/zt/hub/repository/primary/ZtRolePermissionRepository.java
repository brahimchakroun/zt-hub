package com.zt.hub.repository.primary;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zt.hub.entity.primary.ZtRolePermission;
import com.zt.hub.entity.primary.ZtRolePermissionId;

import java.util.List;

public interface ZtRolePermissionRepository extends JpaRepository<ZtRolePermission, ZtRolePermissionId> {
    List<ZtRolePermission> findByRoleCodeIn(List<String> roleCodes);
    void deleteByRoleCode(String roleCode);
}