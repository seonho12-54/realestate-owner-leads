package com.downy.api.common;

import jakarta.servlet.http.HttpServletRequest;

public record RequestMeta(String ip, String userAgent) {

    public static RequestMeta from(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        String ip = forwarded != null && !forwarded.isBlank()
            ? forwarded.split(",")[0].trim()
            : request.getRemoteAddr();
        return new RequestMeta(ip, request.getHeader("User-Agent"));
    }
}
