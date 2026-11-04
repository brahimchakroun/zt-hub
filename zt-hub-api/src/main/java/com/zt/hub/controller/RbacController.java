package com.zt.hub.controller;

import com.zt.hub.dto.ApiResponse;
import com.zt.hub.dto.RbacAccessDto;
import com.zt.hub.dto.RbacMenuDto;
import com.zt.hub.dto.RbacPageDto;
import com.zt.hub.service.PageAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/v1/rbac")
@RequiredArgsConstructor
public class RbacController {

    private final PageAccessService pageAccessService;

    @GetMapping("/me/access")
    public RbacAccessDto getMyAccess(@RequestAttribute("authUserId") UUID userId) {
        return pageAccessService.getAccess(userId);
    }

    @GetMapping("/me/pages")
    public List<RbacPageDto> getMyPages(@RequestAttribute("authUserId") UUID userId) {
        return pageAccessService.getAccessiblePages(userId);
    }

    @GetMapping("/me/menus")
    public ApiResponse<List<RbacMenuDto>> getMyMenus(@RequestAttribute("authUserId") UUID userId) {
        return ApiResponse.of(pageAccessService.getAccessibleMenus(userId));
    }
}