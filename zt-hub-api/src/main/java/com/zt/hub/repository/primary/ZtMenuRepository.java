package com.zt.hub.repository.primary;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zt.hub.entity.primary.ZtMenu;

public interface ZtMenuRepository extends JpaRepository<ZtMenu, String> {

    List<ZtMenu> findByActiveTrueOrderByDisplayOrderAsc();
}