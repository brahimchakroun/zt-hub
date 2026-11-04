package com.zt.hub.repository.primary;

import org.springframework.data.jpa.repository.JpaRepository;

import com.zt.hub.entity.primary.ZtPage;

import java.util.List;

public interface ZtPageRepository extends JpaRepository<ZtPage, String> {
	List<ZtPage> findByPageCodeInAndActiveTrueOrderByDisplayOrderAsc(List<String> pageCodes);
}