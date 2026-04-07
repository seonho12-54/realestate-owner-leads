package com.downy.api.common;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public AuditLogService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public void write(Long adminId, String actionType, String entityType, Long entityId, RequestMeta requestMeta, Map<String, Object> payload) {
        jdbcTemplate.update(
            """
                INSERT INTO audit_logs (
                    admin_id,
                    action_type,
                    entity_type,
                    entity_id,
                    request_ip,
                    user_agent,
                    payload_json
                ) VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON))
                """,
            adminId,
            actionType,
            entityType,
            entityId,
            requestMeta.ip(),
            requestMeta.userAgent(),
            toJson(payload)
        );
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException exception) {
            return "{}";
        }
    }
}
