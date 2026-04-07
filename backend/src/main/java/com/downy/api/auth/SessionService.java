package com.downy.api.auth;

import com.downy.api.auth.SessionModels.AdminSession;
import com.downy.api.auth.SessionModels.SessionKind;
import com.downy.api.auth.SessionModels.SessionSnapshot;
import com.downy.api.auth.SessionModels.UserSession;
import com.downy.api.common.ApiException;
import com.downy.api.config.AppProperties;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class SessionService {

    public static final String ADMIN_SESSION_COOKIE = "rea_admin_session";
    public static final String USER_SESSION_COOKIE = "rea_user_session";

    private final AppProperties properties;
    private final Clock clock;
    private final ObjectMapper objectMapper;

    public SessionService(AppProperties properties, Clock clock, ObjectMapper objectMapper) {
        this.properties = properties;
        this.clock = clock;
        this.objectMapper = objectMapper;
    }

    public AdminSession readAdminSession(HttpServletRequest request) {
        String token = readCookie(request, ADMIN_SESSION_COOKIE);
        return token == null ? null : parseAdminSession(token);
    }

    public UserSession readUserSession(HttpServletRequest request) {
        String token = readCookie(request, USER_SESSION_COOKIE);
        return token == null ? null : parseUserSession(token);
    }

    public SessionSnapshot readSnapshot(HttpServletRequest request) {
        return new SessionSnapshot(readAdminSession(request), readUserSession(request));
    }

    public void setAdminSession(HttpServletResponse response, long adminId, Long officeId, String email, String name, String role) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("adminId", adminId);
        payload.put("officeId", officeId);
        payload.put("email", email);
        payload.put("name", name);
        payload.put("role", role);
        setCookie(response, ADMIN_SESSION_COOKIE, createToken(SessionKind.ADMIN, payload));
    }

    public void setUserSession(HttpServletResponse response, long userId, String email, String name) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", userId);
        payload.put("email", email);
        payload.put("name", name);
        setCookie(response, USER_SESSION_COOKIE, createToken(SessionKind.USER, payload));
    }

    public void clearAdminSession(HttpServletResponse response) {
        clearCookie(response, ADMIN_SESSION_COOKIE);
    }

    public void clearUserSession(HttpServletResponse response) {
        clearCookie(response, USER_SESSION_COOKIE);
    }

    public AdminSession requireAdmin(HttpServletRequest request) {
        AdminSession session = readAdminSession(request);
        if (session == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "관리자 로그인이 필요합니다.");
        }
        return session;
    }

    public UserSession requireUser(HttpServletRequest request) {
        UserSession session = readUserSession(request);
        if (session == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
        return session;
    }

    public boolean hasUserOrAdmin(HttpServletRequest request) {
        SessionSnapshot snapshot = readSnapshot(request);
        return snapshot.isAuthenticated();
    }

    private String createToken(SessionKind kind, Map<String, Object> payload) {
        payload.put("exp", clock.millis() + properties.getSessionDurationDays() * 24L * 60L * 60L * 1000L);

        try {
            String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(objectMapper.writeValueAsBytes(payload));
            String signature = sign(kind, encodedPayload);
            return encodedPayload + "." + signature;
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("세션 토큰을 만들지 못했습니다.", exception);
        }
    }

    private AdminSession parseAdminSession(String token) {
        Map<String, Object> payload = verify(SessionKind.ADMIN, token);
        if (payload == null) {
            return null;
        }

        return new AdminSession(
            asLong(payload.get("adminId")),
            payload.get("officeId") == null ? null : asLong(payload.get("officeId")),
            asString(payload.get("email")),
            asString(payload.get("name")),
            asString(payload.get("role")),
            asLong(payload.get("exp"))
        );
    }

    private UserSession parseUserSession(String token) {
        Map<String, Object> payload = verify(SessionKind.USER, token);
        if (payload == null) {
            return null;
        }

        return new UserSession(
            asLong(payload.get("userId")),
            asString(payload.get("email")),
            asString(payload.get("name")),
            asLong(payload.get("exp"))
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> verify(SessionKind kind, String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 2) {
            return null;
        }

        String expected = sign(kind, parts[0]);
        if (!expected.equals(parts[1])) {
            return null;
        }

        try {
            byte[] decoded = Base64.getUrlDecoder().decode(parts[0]);
            Map<String, Object> payload = objectMapper.readValue(decoded, Map.class);
            Number exp = (Number) payload.get("exp");
            if (exp == null || exp.longValue() <= clock.millis()) {
                return null;
            }
            return payload;
        } catch (Exception exception) {
            return null;
        }
    }

    private String sign(SessionKind kind, String encodedPayload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret(kind).getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(encodedPayload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("세션 서명을 만들지 못했습니다.", exception);
        }
    }

    private String secret(SessionKind kind) {
        return kind == SessionKind.ADMIN ? properties.getAdminSessionSecret() : properties.getUserSessionSecret();
    }

    private String readCookie(HttpServletRequest request, String name) {
        Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }

        for (Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }

        return null;
    }

    private void setCookie(HttpServletResponse response, String name, String value) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(isSecureCookie());
        cookie.setPath("/");
        cookie.setMaxAge((int) (properties.getSessionDurationDays() * 24L * 60L * 60L));
        response.addCookie(cookie);
    }

    private void clearCookie(HttpServletResponse response, String name) {
        Cookie cookie = new Cookie(name, "");
        cookie.setHttpOnly(true);
        cookie.setSecure(isSecureCookie());
        cookie.setPath("/");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
    }

    private boolean isSecureCookie() {
        return properties.getBaseUrl() != null && properties.getBaseUrl().startsWith("https://");
    }

    private String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }

        return Long.parseLong(String.valueOf(value));
    }
}
