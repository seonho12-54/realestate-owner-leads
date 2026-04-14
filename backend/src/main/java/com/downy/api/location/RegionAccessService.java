package com.downy.api.location;

import com.downy.api.auth.SessionModels.RegionSession;
import com.downy.api.auth.SessionModels.UserSession;
import com.downy.api.auth.SessionService;
import com.downy.api.common.ApiException;
import com.downy.api.common.RequestMeta;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class RegionAccessService {

    public static final String REGION_VERIFICATION_REQUIRED = "REGION_VERIFICATION_REQUIRED";
    public static final String REGION_ACCESS_DENIED = "REGION_ACCESS_DENIED";
    public static final String REGION_CHANGE_REQUIRES_REVERIFY = "REGION_CHANGE_REQUIRES_REVERIFY";
    public static final String REGION_UNSUPPORTED = "REGION_UNSUPPORTED";

    private final JdbcTemplate jdbcTemplate;
    private final SessionService sessionService;
    private final KakaoLocationService kakaoLocationService;
    private final ServiceAreaSupport serviceAreaSupport;

    public RegionAccessService(
        JdbcTemplate jdbcTemplate,
        SessionService sessionService,
        KakaoLocationService kakaoLocationService,
        ServiceAreaSupport serviceAreaSupport
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.sessionService = sessionService;
        this.kakaoLocationService = kakaoLocationService;
        this.serviceAreaSupport = serviceAreaSupport;
    }

    public RegionStatusResponse getRegionStatus(HttpServletRequest request) {
        UserSession userSession = sessionService.readUserSession(request);
        if (userSession != null) {
            UserRegionRecord persisted = findUserRegion(userSession.userId());
            if (persisted != null && persisted.locationLocked() && StringUtils.hasText(persisted.regionSlug())) {
                return toStatus(persisted.regionSlug(), persisted.regionName(), persisted.verifiedAt(), "user");
            }

            if (userSession.locationLocked() && StringUtils.hasText(userSession.verifiedRegionSlug())) {
                return toStatus(userSession.verifiedRegionSlug(), userSession.verifiedRegionName(), userSession.regionVerifiedAt(), "user");
            }
        }

        RegionSession regionSession = sessionService.readRegionSession(request);
        if (regionSession != null && regionSession.locationLocked() && StringUtils.hasText(regionSession.regionSlug())) {
            return toStatus(regionSession.regionSlug(), regionSession.regionName(), regionSession.verifiedAt(), "guest");
        }

        return RegionStatusResponse.unverified();
    }

    public RegionStatusResponse requireVerifiedRegion(HttpServletRequest request) {
        RegionStatusResponse status = getRegionStatus(request);
        if (!status.locked() || status.region() == null) {
            throw new ApiException(HttpStatus.FORBIDDEN, REGION_VERIFICATION_REQUIRED, "내 동네 인증을 먼저 완료해주세요.");
        }
        return status;
    }

    public void ensureListingAccess(HttpServletRequest request, String listingRegionSlug) {
        RegionStatusResponse status = requireVerifiedRegion(request);
        if (!Objects.equals(status.region().slug(), listingRegionSlug)) {
            throw new ApiException(HttpStatus.FORBIDDEN, REGION_ACCESS_DENIED, "인증한 지역 밖의 매물은 볼 수 없어요.");
        }
    }

    public RegionStatusResponse verifyAndLock(
        double latitude,
        double longitude,
        HttpServletRequest request,
        HttpServletResponse response,
        RequestMeta requestMeta,
        boolean reverify
    ) {
        KakaoLocationService.VerificationResponse verification = kakaoLocationService.verify(latitude, longitude);
        ServiceAreaSupport.ServiceArea area = verification.regionSlug() == null
            ? null
            : serviceAreaSupport.findBySlug(verification.regionSlug());

        RegionStatusResponse currentStatus = getRegionStatus(request);
        UserSession userSession = sessionService.readUserSession(request);

        if (area == null) {
            writeVerificationLog(
                userSession == null ? null : userSession.userId(),
                requestMeta,
                latitude,
                longitude,
                verification.regionSlug(),
                verification.regionName(),
                false
            );
            throw new ApiException(HttpStatus.BAD_REQUEST, REGION_UNSUPPORTED, "아직 지원하지 않는 지역이에요. 서비스 지역 안에서 다시 인증해주세요.");
        }

        if (
            currentStatus.locked()
                && currentStatus.region() != null
                && !Objects.equals(currentStatus.region().slug(), area.slug())
                && !reverify
        ) {
            writeVerificationLog(
                userSession == null ? null : userSession.userId(),
                requestMeta,
                latitude,
                longitude,
                area.slug(),
                area.name(),
                false
            );
            throw new ApiException(
                HttpStatus.CONFLICT,
                REGION_CHANGE_REQUIRES_REVERIFY,
                "이미 인증한 동네가 있어요. 지역 변경은 설정에서 다시 인증해주세요."
            );
        }

        long verifiedAt = Instant.now().toEpochMilli();
        if (userSession != null) {
            persistUserRegion(userSession.userId(), area.slug(), area.name(), verifiedAt);
            sessionService.setUserSession(
                response,
                userSession.userId(),
                userSession.email(),
                userSession.name(),
                area.slug(),
                area.name(),
                true,
                verifiedAt
            );
        }

        sessionService.setRegionSession(response, area.slug(), area.name(), true, verifiedAt);
        writeVerificationLog(
            userSession == null ? null : userSession.userId(),
            requestMeta,
            latitude,
            longitude,
            area.slug(),
            area.name(),
            true
        );
        return toStatus(area.slug(), area.name(), verifiedAt, userSession != null ? "user" : "guest");
    }

    public UserSession syncAuthenticatedRegion(UserSession session, HttpServletRequest request) {
        UserRegionRecord persisted = findUserRegion(session.userId());
        if (persisted != null && persisted.locationLocked() && StringUtils.hasText(persisted.regionSlug())) {
            return new UserSession(
                session.userId(),
                session.email(),
                session.name(),
                persisted.regionSlug(),
                persisted.regionName(),
                true,
                persisted.verifiedAt(),
                session.exp()
            );
        }

        RegionSession regionSession = sessionService.readRegionSession(request);
        if (regionSession != null && regionSession.locationLocked() && StringUtils.hasText(regionSession.regionSlug())) {
            persistUserRegion(session.userId(), regionSession.regionSlug(), regionSession.regionName(), regionSession.verifiedAt());
            return new UserSession(
                session.userId(),
                session.email(),
                session.name(),
                regionSession.regionSlug(),
                regionSession.regionName(),
                true,
                regionSession.verifiedAt(),
                session.exp()
            );
        }

        return session;
    }

    public void writeRegionCookie(HttpServletResponse response, UserSession session) {
        if (session.locationLocked() && StringUtils.hasText(session.verifiedRegionSlug())) {
            sessionService.setRegionSession(
                response,
                session.verifiedRegionSlug(),
                session.verifiedRegionName(),
                true,
                session.regionVerifiedAt()
            );
        }
    }

    public String requireVerifiedRegionSlug(HttpServletRequest request) {
        return requireVerifiedRegion(request).region().slug();
    }

    private RegionStatusResponse toStatus(String regionSlug, String regionName, long verifiedAt, String source) {
        ServiceAreaSupport.ServiceArea area = serviceAreaSupport.findBySlug(regionSlug);
        if (area == null) {
            return RegionStatusResponse.unverified();
        }

        return new RegionStatusResponse(
            true,
            new RegionSummary(area.slug(), regionName != null ? regionName : area.name(), area.city(), area.district(), area.neighborhood(), area.lat(), area.lng()),
            verifiedAt,
            source
        );
    }

    private void persistUserRegion(long userId, String regionSlug, String regionName, long verifiedAt) {
        jdbcTemplate.update(
            """
                UPDATE users
                SET
                    verified_region_slug = ?,
                    verified_region_name = ?,
                    region_verified_at = ?,
                    location_locked = TRUE
                WHERE id = ?
                """,
            regionSlug,
            regionName,
            Timestamp.from(Instant.ofEpochMilli(verifiedAt)),
            userId
        );
    }

    private UserRegionRecord findUserRegion(long userId) {
        return jdbcTemplate.query(
            """
                SELECT verified_region_slug, verified_region_name, region_verified_at, location_locked
                FROM users
                WHERE id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapUserRegion(rs),
            userId
        ).stream().findFirst().orElse(null);
    }

    private UserRegionRecord mapUserRegion(ResultSet rs) throws SQLException {
        Timestamp verifiedAt = rs.getTimestamp("region_verified_at");
        return new UserRegionRecord(
            rs.getString("verified_region_slug"),
            rs.getString("verified_region_name"),
            verifiedAt == null ? 0L : verifiedAt.toInstant().toEpochMilli(),
            rs.getBoolean("location_locked")
        );
    }

    private void writeVerificationLog(
        Long userId,
        RequestMeta requestMeta,
        double latitude,
        double longitude,
        String resolvedRegionSlug,
        String resolvedRegionName,
        boolean success
    ) {
        jdbcTemplate.update(
            """
                INSERT INTO location_verification_logs (
                    user_id,
                    session_key,
                    attempted_lat,
                    attempted_lng,
                    resolved_region_slug,
                    resolved_region_name,
                    success,
                    device_info,
                    ip_address
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
            userId,
            buildSessionKey(requestMeta),
            latitude,
            longitude,
            resolvedRegionSlug,
            resolvedRegionName,
            success,
            requestMeta.userAgent(),
            requestMeta.ip()
        );
    }

    private String buildSessionKey(RequestMeta requestMeta) {
        String raw = (requestMeta.ip() == null ? "" : requestMeta.ip()) + "|" + (requestMeta.userAgent() == null ? "" : requestMeta.userAgent());
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8))).substring(0, 32);
        } catch (Exception exception) {
            return null;
        }
    }

    private record UserRegionRecord(String regionSlug, String regionName, long verifiedAt, boolean locationLocked) {
    }

    public record RegionSummary(
        String slug,
        String name,
        String city,
        String district,
        String neighborhood,
        double centerLat,
        double centerLng
    ) {
    }

    public record RegionStatusResponse(boolean locked, RegionSummary region, long verifiedAt, String source) {
        public static RegionStatusResponse unverified() {
            return new RegionStatusResponse(false, null, 0L, "none");
        }
    }
}
