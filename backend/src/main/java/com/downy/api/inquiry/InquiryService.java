package com.downy.api.inquiry;

import com.downy.api.common.ApiException;
import com.downy.api.common.AuditLogService;
import com.downy.api.common.RequestMeta;
import com.downy.api.inquiry.InquiryDtos.InquiryDetailResponse;
import com.downy.api.inquiry.InquiryDtos.InquirySummaryResponse;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InquiryService {

    private static final String SECRET_TITLE = "비밀글입니다.";
    private static final String SECRET_PREVIEW = "작성자와 관리자만 확인할 수 있는 비밀글입니다.";
    private static final String SECRET_CONTENT = "작성자와 관리자만 본문을 확인할 수 있습니다.";
    private static final String SECRET_REPLY = "관리자 답변은 작성자와 관리자만 확인할 수 있습니다.";

    private final JdbcTemplate jdbcTemplate;
    private final AuditLogService auditLogService;

    public InquiryService(JdbcTemplate jdbcTemplate, AuditLogService auditLogService) {
        this.jdbcTemplate = jdbcTemplate;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public long createInquiry(InquiryDtos.CreateInquiryRequest request, long userId, RequestMeta requestMeta) {
        ensureUserExists(userId);

        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                """
                    INSERT INTO support_inquiries (
                        user_id,
                        title,
                        content,
                        is_secret,
                        status,
                        request_ip,
                        user_agent
                    ) VALUES (?, ?, ?, ?, 'open', ?, ?)
                    """,
                Statement.RETURN_GENERATED_KEYS
            );
            ps.setLong(1, userId);
            ps.setString(2, request.title().trim());
            ps.setString(3, request.content().trim());
            ps.setBoolean(4, request.secret());
            ps.setString(5, requestMeta.ip());
            ps.setString(6, requestMeta.userAgent());
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "문의 번호를 만들지 못했습니다.");
        }

        long inquiryId = key.longValue();
        auditLogService.write(
            null,
            "inquiry.created",
            "support_inquiry",
            inquiryId,
            requestMeta,
            Map.of("userId", userId, "secret", request.secret(), "title", request.title().trim())
        );
        return inquiryId;
    }

    public List<InquirySummaryResponse> listInquiries(Long viewerUserId, boolean adminView) {
        return jdbcTemplate.query(
            """
                SELECT
                    i.id,
                    i.user_id,
                    i.title,
                    i.content,
                    i.is_secret,
                    i.status,
                    i.admin_reply,
                    i.created_at,
                    u.name AS user_name
                FROM support_inquiries i
                LEFT JOIN users u ON u.id = i.user_id
                ORDER BY i.created_at DESC, i.id DESC
                """,
            (rs, rowNum) -> toSummary(mapRow(rs), viewerUserId, adminView)
        );
    }

    public InquiryDetailResponse getInquiryDetail(long inquiryId, Long viewerUserId, boolean adminView) {
        InquiryRow row = jdbcTemplate.query(
            """
                SELECT
                    i.id,
                    i.user_id,
                    i.title,
                    i.content,
                    i.is_secret,
                    i.status,
                    i.admin_reply,
                    i.admin_reply_at,
                    i.created_at,
                    u.name AS user_name,
                    a.name AS admin_name
                FROM support_inquiries i
                LEFT JOIN users u ON u.id = i.user_id
                LEFT JOIN admins a ON a.id = i.admin_reply_admin_id
                WHERE i.id = ?
                LIMIT 1
                """,
            (rs, rowNum) -> mapRow(rs),
            inquiryId
        ).stream().findFirst().orElse(null);

        if (row == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "문의를 찾을 수 없습니다.");
        }

        return toDetail(row, viewerUserId, adminView);
    }

    @Transactional
    public void replyToInquiry(long inquiryId, String reply, long adminId, RequestMeta requestMeta) {
        int updated = jdbcTemplate.update(
            """
                UPDATE support_inquiries
                SET
                    admin_reply = ?,
                    admin_reply_at = NOW(),
                    admin_reply_admin_id = ?,
                    status = 'answered'
                WHERE id = ?
                """,
            reply.trim(),
            adminId,
            inquiryId
        );

        if (updated == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "문의를 찾을 수 없습니다.");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("replyLength", reply.trim().length());
        payload.put("status", "answered");
        auditLogService.write(adminId, "inquiry.replied", "support_inquiry", inquiryId, requestMeta, payload);
    }

    private InquirySummaryResponse toSummary(InquiryRow row, Long viewerUserId, boolean adminView) {
        boolean mine = viewerUserId != null && Objects.equals(viewerUserId, row.userId());
        boolean canRead = adminView || mine || !row.secret();

        return new InquirySummaryResponse(
            row.id(),
            canRead ? row.title() : SECRET_TITLE,
            row.userName(),
            row.secret(),
            mine,
            canRead,
            row.answered(),
            row.status(),
            row.createdAt(),
            canRead ? abbreviate(row.content(), 90) : SECRET_PREVIEW
        );
    }

    private InquiryDetailResponse toDetail(InquiryRow row, Long viewerUserId, boolean adminView) {
        boolean mine = viewerUserId != null && Objects.equals(viewerUserId, row.userId());
        boolean canRead = adminView || mine || !row.secret();

        return new InquiryDetailResponse(
            row.id(),
            canRead ? row.title() : SECRET_TITLE,
            row.userName(),
            row.secret(),
            mine,
            canRead,
            row.answered(),
            row.status(),
            row.createdAt(),
            canRead ? row.content() : SECRET_CONTENT,
            canRead ? row.adminReply() : (row.answered() ? SECRET_REPLY : null),
            row.adminReplyAt(),
            canRead ? row.adminReplyAdminName() : null
        );
    }

    private InquiryRow mapRow(java.sql.ResultSet rs) throws java.sql.SQLException {
        Long userId = null;
        long rawUserId = rs.getLong("user_id");
        if (!rs.wasNull()) {
            userId = rawUserId;
        }

        return new InquiryRow(
            rs.getLong("id"),
            userId,
            safeString(rs, "user_name", "알 수 없음"),
            rs.getString("title"),
            rs.getString("content"),
            rs.getBoolean("is_secret"),
            rs.getString("status"),
            safeString(rs, "admin_reply", null),
            safeInstant(rs, "admin_reply_at"),
            safeString(rs, "admin_name", null),
            rs.getTimestamp("created_at").toInstant()
        );
    }

    private Instant safeInstant(java.sql.ResultSet rs, String columnName) throws java.sql.SQLException {
        try {
            Timestamp timestamp = rs.getTimestamp(columnName);
            return timestamp == null ? null : timestamp.toInstant();
        } catch (java.sql.SQLException ignored) {
            return null;
        }
    }

    private String safeString(java.sql.ResultSet rs, String columnName, String defaultValue) throws java.sql.SQLException {
        try {
            String value = rs.getString(columnName);
            if (value == null || value.isBlank()) {
                return defaultValue;
            }
            return value;
        } catch (java.sql.SQLException ignored) {
            return defaultValue;
        }
    }

    private String abbreviate(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return "";
        }

        String trimmed = value.trim();
        if (trimmed.length() <= maxLength) {
            return trimmed;
        }

        return trimmed.substring(0, maxLength) + "...";
    }

    private void ensureUserExists(long userId) {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM users WHERE id = ? AND is_active = 1",
            Integer.class,
            userId
        );
        if (count == null || count == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "문의할 회원 정보를 찾을 수 없습니다.");
        }
    }

    private record InquiryRow(
        long id,
        Long userId,
        String userName,
        String title,
        String content,
        boolean secret,
        String status,
        String adminReply,
        Instant adminReplyAt,
        String adminReplyAdminName,
        Instant createdAt
    ) {
        boolean answered() {
            return adminReply != null && !adminReply.isBlank();
        }
    }
}
