package com.zt.hub.repository.primary;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zt.hub.entity.primary.ZtRolePage;
import com.zt.hub.entity.primary.ZtRolePageId;

import java.util.List;

public interface ZtRolePageRepository extends JpaRepository<ZtRolePage, ZtRolePageId> {
    List<ZtRolePage> findByRoleCodeIn(List<String> roleCodes);
    List<ZtRolePage> findByRoleCodeOrderByPageCode(String roleCode);
    void deleteByRoleCode(String roleCode);
    void deleteByPageCode(String pageCode);
}