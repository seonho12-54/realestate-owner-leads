package com.downy.api.auth;

import com.downy.api.auth.SessionModels.AdminSession;
import com.downy.api.auth.SessionModels.RegionSession;
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
import java.security.MessageDigest;
import java.time.Clock;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class SessionService {

    public static final String ADMIN_SESSION_COOKIE = "rea_admin_session";
    public static final String USER_SESSION_COOKIE = "rea_user_session";
    public static final String REGION_SESSION_COOKIE = "rea_region_lock";

    private final AppProperties properties;
    private final Clock clock;
    private final ObjectMapper objectMapper;

    public SessionService(AppProperties properties, Clock clock, ObjectMapper objectMapper) {
        this.properties = properties;
        this.clock = clock;
        this.objectMapper = objectMapper;
    }

    public AdminSession readAdminSession(HttpServletRequest request) {
        String token = readToken(request, ADMIN_SESSION_COOKIE, true);
        return token == null ? null : parseAdminSession(token);
    }

    public UserSession readUserSession(HttpServletRequest request) {
        String token = readToken(request, USER_SESSION_COOKIE, true);
        return token == null ? null : parseUserSession(token);
    }

    public RegionSession readRegionSession(HttpServletRequest request) {
        String token = readToken(request, REGION_SESSION_COOKIE, false);
        return token == null ? null : parseRegionSession(token);
    }

    public SessionSnapshot readSnapshot(HttpServletRequest request) {
        return new SessionSnapshot(readAdminSession(request), readUserSession(request));
    }

    public String setAdminSession(HttpServletResponse response, long adminId, Long officeId, String email, String name, String role) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("adminId", adminId);
        payload.put("officeId", officeId);
        payload.put("email", email);
        payload.put("name", name);
        payload.put("role", role);
        String token = createToken(SessionKind.ADMIN, payload);
        setCookie(response, ADMIN_SESSION_COOKIE, token);
        return token;
    }

    public String setUserSession(
        HttpServletResponse response,
        long userId,
        String email,
        String name,
        String verifiedRegionSlug,
        String verifiedRegionName,
        boolean locationLocked,
        long regionVerifiedAt
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", userId);
        payload.put("email", email);
        payload.put("name", name);
        payload.put("verifiedRegionSlug", verifiedRegionSlug);
        payload.put("verifiedRegionName", verifiedRegionName);
        payload.put("locationLocked", locationLocked);
        payload.put("regionVerifiedAt", regionVerifiedAt);
        String token = createToken(SessionKind.USER, payload);
        setCookie(response, USER_SESSION_COOKIE, token);
        return token;
    }

    public String setRegionSession(
        HttpServletResponse response,
        String regionSlug,
        String regionName,
        boolean locationLocked,
        long verifiedAt
    ) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("regionSlug", regionSlug);
        payload.put("regionName", regionName);
        payload.put("locationLocked", locationLocked);
        payload.put("verifiedAt", verifiedAt);
        String token = createToken(SessionKind.REGION, payload);
        setCookie(response, REGION_SESSION_COOKIE, token);
        return token;
    }

    public void clearAdminSession(HttpServletResponse response) {
        clearCookie(response, ADMIN_SESSION_COOKIE);
    }

    public void clearUserSession(HttpServletResponse response) {
        clearCookie(response, USER_SESSION_COOKIE);
    }

    public void clearRegionSession(HttpServletResponse response) {
        clearCookie(response, REGION_SESSION_COOKIE);
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
        long issuedAt = clock.instant().getEpochSecond();
        long expiresAt = issuedAt + properties.getSessionDurationDays() * 24L * 60L * 60L;

        Map<String, Object> claims = new LinkedHashMap<>(payload);
        claims.put("kind", kind.name().toLowerCase(Locale.ROOT));
        claims.put("iat", issuedAt);
        claims.put("exp", expiresAt);

        try {
            String encodedHeader = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(objectMapper.writeValueAsBytes(Map.of("alg", "HS256", "typ", "JWT")));
            String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(objectMapper.writeValueAsBytes(claims));
            String signingInput = encodedHeader + "." + encodedPayload;
            return signingInput + "." + sign(kind, signingInput);
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
            asExpirationMillis(payload.get("exp"))
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
            asString(payload.get("verifiedRegionSlug")),
            asString(payload.get("verifiedRegionName")),
            asBoolean(payload.get("locationLocked")),
            asOptionalEpochMillis(payload.get("regionVerifiedAt")),
            asExpirationMillis(payload.get("exp"))
        );
    }

    private RegionSession parseRegionSession(String token) {
        Map<String, Object> payload = verify(SessionKind.REGION, token);
        if (payload == null) {
            return null;
        }

        return new RegionSession(
            asString(payload.get("regionSlug")),
            asString(payload.get("regionName")),
            asBoolean(payload.get("locationLocked")),
            asOptionalEpochMillis(payload.get("verifiedAt")),
            asExpirationMillis(payload.get("exp"))
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> verify(SessionKind kind, String token) {
        String[] parts = token.split("\\.");
        return switch (parts.length) {
            case 2 -> verifyLegacyToken(kind, parts);
            case 3 -> verifyJwtToken(kind, parts);
            default -> null;
        };
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> verifyJwtToken(SessionKind kind, String[] parts) {
        String signingInput = parts[0] + "." + parts[1];
        String expected = sign(kind, signingInput);
        if (!secureEquals(expected, parts[2])) {
            return null;
        }

        try {
            byte[] decoded = Base64.getUrlDecoder().decode(parts[1]);
            Map<String, Object> payload = objectMapper.readValue(decoded, Map.class);
            if (!kind.name().equalsIgnoreCase(asString(payload.get("kind")))) {
                return null;
            }

            Number exp = (Number) payload.get("exp");
            if (exp == null || exp.longValue() <= clock.instant().getEpochSecond()) {
                return null;
            }

            return payload;
        } catch (Exception exception) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> verifyLegacyToken(SessionKind kind, String[] parts) {
        String expected = sign(kind, parts[0]);
        if (!secureEquals(expected, parts[1])) {
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

    private String sign(SessionKind kind, String signingInput) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret(kind).getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(signingInput.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("세션 서명을 만들지 못했습니다.", exception);
        }
    }

    private String secret(SessionKind kind) {
        return switch (kind) {
            case ADMIN -> properties.getAdminSessionSecret();
            case USER, REGION -> properties.getUserSessionSecret();
        };
    }

    private String readToken(HttpServletRequest request, String cookieName, boolean allowBearer) {
        if (allowBearer) {
            String bearerToken = readBearerToken(request);
            if (bearerToken != null) {
                return bearerToken;
            }
        }

        return readCookie(request, cookieName);
    }

    private String readBearerToken(HttpServletRequest request) {
        String authorization = request.getHeader("Authorization");
        if (authorization == null || authorization.isBlank()) {
            return null;
        }

        if (!authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            return null;
        }

        String token = authorization.substring(7).trim();
        return token.isEmpty() ? null : token;
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

    private boolean asBoolean(Object value) {
        if (value instanceof Boolean bool) {
            return bool;
        }

        if (value instanceof Number number) {
            return number.intValue() != 0;
        }

        return value != null && Boolean.parseBoolean(String.valueOf(value));
    }

    private long asLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }

        return Long.parseLong(String.valueOf(value));
    }

    private long asOptionalEpochMillis(Object value) {
        if (value == null) {
            return 0L;
        }

        long rawValue = asLong(value);
        return rawValue >= 1_000_000_000_000L ? rawValue : rawValue * 1000L;
    }

    private long asExpirationMillis(Object value) {
        return asOptionalEpochMillis(value);
    }

    private boolean secureEquals(String left, String right) {
        return MessageDigest.isEqual(left.getBytes(StandardCharsets.UTF_8), right.getBytes(StandardCharsets.UTF_8));
    }
}
