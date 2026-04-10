package com.downy.api.auth;

import com.downy.api.common.ApiException;
import com.downy.api.common.AuditLogService;
import com.downy.api.common.RequestMeta;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;

    public UserProfileService(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder, AuditLogService auditLogService) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.auditLogService = auditLogService;
    }

    public ProfileResponse getProfile(long userId) {
        UserRecord user = requireUser(userId);
        return toProfileResponse(user);
    }

    public void verifyPassword(long userId, String password) {
        UserRecord user = requireUser(userId);
        if (!passwordEncoder.matches(password, user.passwordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "비밀번호를 다시 확인해 주세요.");
        }
    }

    @Transactional
    public UserSessionPayload updateProfile(long userId, UpdateProfileCommand command, RequestMeta requestMeta) {
        UserRecord user = requireUser(userId);
        verifyPassword(userId, command.currentPassword());

        String normalizedName = normalizeName(command.name());
        String normalizedEmail = normalizeEmail(command.email());
        String nextPasswordHash = user.passwordHash();
        boolean passwordChanged = false;

        validateEmailAvailability(normalizedEmail, userId);

        if (command.newPassword() != null && !command.newPassword().isBlank()) {
            validateNewPassword(command.newPassword());
            nextPasswordHash = passwordEncoder.encode(command.newPassword());
            passwordChanged = true;
        }

        jdbcTemplate.update(
            """
                UPDATE users
                SET name = ?, email = ?, password_hash = ?
                WHERE id = ?
                """,
            normalizedName,
            normalizedEmail,
            nextPasswordHash,
            userId
        );

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("email", normalizedEmail);
        payload.put("name", normalizedName);
        payload.put("passwordChanged", passwordChanged);
        auditLogService.write(null, "user.profile.update", "user", userId, requestMeta, payload);

        return toSessionPayload(requireUser(userId));
    }

    private void validateEmailAvailability(String normalizedEmail, long userId) {
        Long duplicateUserId = jdbcTemplate.query(
            """
                SELECT id
                FROM users
                WHERE LOWER(email) = ?
                  AND id <> ?
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getLong("id"),
            normalizedEmail,
            userId
        ).stream().findFirst().orElse(null);

        if (duplicateUserId != null) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 사용 중인 이메일입니다.");
        }
    }

    private void validateNewPassword(String value) {
        String password = value == null ? "" : value.trim();
        if (password.length() < 8 || password.length() > 128) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "새 비밀번호는 8자 이상으로 입력해 주세요.");
        }

        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "새 비밀번호는 영문과 숫자를 모두 포함해야 합니다.");
        }
    }

    private UserRecord requireUser(long userId) {
        UserRecord user = jdbcTemplate.query(
            """
                SELECT
                    id,
                    email,
                    password_hash,
                    name,
                    phone,
                    phone_verified_at,
                    verified_region_slug,
                    verified_region_name,
                    region_verified_at,
                    location_locked
                FROM users
                WHERE id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapUser(rs),
            userId
        ).stream().findFirst().orElse(null);

        if (user == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "회원 정보를 찾을 수 없습니다.");
        }

        return user;
    }

    private ProfileResponse toProfileResponse(UserRecord user) {
        return new ProfileResponse(
            user.id(),
            user.name(),
            user.email(),
            user.phone(),
            user.phoneVerifiedAt(),
            user.verifiedRegionName()
        );
    }

    private UserSessionPayload toSessionPayload(UserRecord user) {
        return new UserSessionPayload(
            user.id(),
            user.name(),
            user.email(),
            user.phone(),
            user.phoneVerifiedAt(),
            user.verifiedRegionSlug(),
            user.verifiedRegionName(),
            user.locationLocked(),
            user.regionVerifiedAt()
        );
    }

    private UserRecord mapUser(ResultSet rs) throws SQLException {
        Timestamp phoneVerifiedAt = rs.getTimestamp("phone_verified_at");
        Timestamp regionVerifiedAt = rs.getTimestamp("region_verified_at");
        return new UserRecord(
            rs.getLong("id"),
            rs.getString("email"),
            rs.getString("password_hash"),
            rs.getString("name"),
            rs.getString("phone"),
            phoneVerifiedAt == null ? 0L : phoneVerifiedAt.toInstant().toEpochMilli(),
            rs.getString("verified_region_slug"),
            rs.getString("verified_region_name"),
            regionVerifiedAt == null ? 0L : regionVerifiedAt.toInstant().toEpochMilli(),
            rs.getBoolean("location_locked")
        );
    }

    private String normalizeEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeName(String value) {
        return value == null ? "" : value.trim();
    }

    private record UserRecord(
        long id,
        String email,
        String passwordHash,
        String name,
        String phone,
        long phoneVerifiedAt,
        String verifiedRegionSlug,
        String verifiedRegionName,
        long regionVerifiedAt,
        boolean locationLocked
    ) {
    }

    public record ProfileResponse(long id, String name, String email, String phone, long phoneVerifiedAt, String verifiedRegionName) {
    }

    public record UpdateProfileCommand(String name, String email, String currentPassword, String newPassword) {
    }

    public record UserSessionPayload(
        long userId,
        String name,
        String email,
        String phone,
        long phoneVerifiedAt,
        String verifiedRegionSlug,
        String verifiedRegionName,
        boolean locationLocked,
        long regionVerifiedAt
    ) {
    }
}
