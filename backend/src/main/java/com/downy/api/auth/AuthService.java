package com.downy.api.auth;

import com.downy.api.auth.SessionModels.AdminSession;
import com.downy.api.auth.SessionModels.UserSession;
import com.downy.api.common.ApiException;
import com.downy.api.common.AuditLogService;
import com.downy.api.common.RequestMeta;
import com.downy.api.location.RegionAccessService.RegionStatusResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public AuthService(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder, AuditLogService auditLogService) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    public UserSession signup(UserSignupRequest request, RequestMeta requestMeta) {
        String normalizedEmail = normalizeEmail(request.email());
        String normalizedName = normalizeName(request.name());
        UserRecord existing = findUserByEmail(normalizedEmail);

        if (existing != null) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 가입한 이메일입니다.");
        }

        jdbcTemplate.update(
            """
                INSERT INTO users (
                    email,
                    password_hash,
                    name,
                    phone,
                    is_active
                ) VALUES (?, ?, ?, ?, 1)
                """,
            normalizedEmail,
            passwordEncoder.encode(request.password()),
            normalizedName,
            blankToNull(request.phone())
        );

        Long userId = jdbcTemplate.queryForObject("SELECT id FROM users WHERE LOWER(email) = ?", Long.class, normalizedEmail);
        if (userId == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "회원 정보를 저장하지 못했습니다.");
        }

        auditLogService.write(null, "user.signup", "user", userId, requestMeta, Map.of("email", normalizedEmail));
        return new UserSession(userId, normalizedEmail, normalizedName, null, null, false, 0L, 0L);
    }

    public LoginResult login(UserLoginRequest request, RequestMeta requestMeta) {
        String normalizedEmail = normalizeEmail(request.email());

        AdminRecord admin = findAdminByEmail(normalizedEmail);
        if (admin != null && Boolean.TRUE.equals(admin.active()) && passwordEncoder.matches(request.password(), admin.passwordHash())) {
            jdbcTemplate.update("UPDATE admins SET last_login_at = ? WHERE id = ?", Instant.now(), admin.id());
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("email", admin.email());
            payload.put("role", admin.role());
            auditLogService.write(admin.id(), "admin.login", "admin", admin.id(), requestMeta, payload);
            return LoginResult.admin(new AdminSession(admin.id(), admin.officeId(), admin.email(), admin.name(), admin.role(), 0L));
        }

        UserRecord user = findUserByEmail(normalizedEmail);
        if (user == null || !Boolean.TRUE.equals(user.active())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해주세요.");
        }

        if (!passwordEncoder.matches(request.password(), user.passwordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해주세요.");
        }

        jdbcTemplate.update("UPDATE users SET last_login_at = ? WHERE id = ?", Instant.now(), user.id());
        auditLogService.write(null, "user.login", "user", user.id(), requestMeta, Map.of("email", user.email()));
        return LoginResult.user(
            new UserSession(
                user.id(),
                user.email(),
                user.name(),
                user.verifiedRegionSlug(),
                user.verifiedRegionName(),
                Boolean.TRUE.equals(user.locationLocked()),
                user.regionVerifiedAt(),
                0L
            )
        );
    }

    public AdminSession loginAdmin(AdminLoginRequest request, RequestMeta requestMeta) {
        AdminRecord admin = findAdminByEmail(normalizeEmail(request.email()));
        if (admin == null || !Boolean.TRUE.equals(admin.active())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "관리자 계정을 확인해주세요.");
        }

        if (!passwordEncoder.matches(request.password(), admin.passwordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "관리자 계정을 확인해주세요.");
        }

        jdbcTemplate.update("UPDATE admins SET last_login_at = ? WHERE id = ?", Instant.now(), admin.id());
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", admin.email());
        payload.put("role", admin.role());
        auditLogService.write(admin.id(), "admin.login", "admin", admin.id(), requestMeta, payload);
        return new AdminSession(admin.id(), admin.officeId(), admin.email(), admin.name(), admin.role(), 0L);
    }

    public CurrentSessionResponse snapshot(
        AdminSession adminSession,
        UserSession userSession,
        String kakaoJsKey,
        RegionStatusResponse regionStatus
    ) {
        if (adminSession != null) {
            return new CurrentSessionResponse(
                true,
                "admin",
                new CurrentUser(adminSession.adminId(), adminSession.email(), adminSession.name(), adminSession.role(), adminSession.officeId()),
                kakaoJsKey,
                regionStatus
            );
        }

        if (userSession != null) {
            return new CurrentSessionResponse(
                true,
                "user",
                new CurrentUser(userSession.userId(), userSession.email(), userSession.name(), null, null),
                kakaoJsKey,
                regionStatus
            );
        }

        return new CurrentSessionResponse(false, null, null, kakaoJsKey, regionStatus);
    }

    private UserRecord findUserByEmail(String email) {
        return jdbcTemplate.query(
            """
                SELECT
                    id,
                    email,
                    password_hash,
                    name,
                    is_active,
                    verified_region_slug,
                    verified_region_name,
                    region_verified_at,
                    location_locked
                FROM users
                WHERE LOWER(email) = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapUser(rs),
            email
        ).stream().findFirst().orElse(null);
    }

    private AdminRecord findAdminByEmail(String email) {
        return jdbcTemplate.query(
            """
                SELECT id, office_id, email, password_hash, name, role, is_active
                FROM admins
                WHERE LOWER(email) = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapAdmin(rs),
            email
        ).stream().findFirst().orElse(null);
    }

    private UserRecord mapUser(ResultSet rs) throws SQLException {
        Timestamp verifiedAt = rs.getTimestamp("region_verified_at");
        return new UserRecord(
            rs.getLong("id"),
            rs.getString("email"),
            rs.getString("password_hash"),
            rs.getString("name"),
            rs.getBoolean("is_active"),
            rs.getString("verified_region_slug"),
            rs.getString("verified_region_name"),
            verifiedAt == null ? 0L : verifiedAt.toInstant().toEpochMilli(),
            rs.getBoolean("location_locked")
        );
    }

    private AdminRecord mapAdmin(ResultSet rs) throws SQLException {
        long officeId = rs.getLong("office_id");
        return new AdminRecord(
            rs.getLong("id"),
            rs.wasNull() ? null : officeId,
            rs.getString("email"),
            rs.getString("password_hash"),
            rs.getString("name"),
            rs.getString("role"),
            rs.getBoolean("is_active")
        );
    }

    private String normalizeEmail(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeName(String value) {
        return value == null ? "" : value.trim();
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record UserRecord(
        long id,
        String email,
        String passwordHash,
        String name,
        Boolean active,
        String verifiedRegionSlug,
        String verifiedRegionName,
        long regionVerifiedAt,
        Boolean locationLocked
    ) {
    }

    private record AdminRecord(long id, Long officeId, String email, String passwordHash, String name, String role, Boolean active) {
    }

    public record UserSignupRequest(String name, String email, String phone, String password) {
    }

    public record UserLoginRequest(String email, String password) {
    }

    public record AdminLoginRequest(String email, String password) {
    }

    public record CurrentUser(long id, String email, String name, String role, Long officeId) {
    }

    public record CurrentSessionResponse(
        boolean authenticated,
        String kind,
        CurrentUser user,
        String kakaoJsKey,
        RegionStatusResponse region
    ) {
    }

    public record LoginResult(String kind, AdminSession adminSession, UserSession userSession) {
        public static LoginResult admin(AdminSession session) {
            return new LoginResult("admin", session, null);
        }

        public static LoginResult user(UserSession session) {
            return new LoginResult("user", null, session);
        }
    }
}
