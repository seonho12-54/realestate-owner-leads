package com.downy.api.auth;

import com.downy.api.config.AppProperties;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

@Component
public class AdminBootstrapService implements ApplicationRunner {

    private static final Logger logger = LoggerFactory.getLogger(AdminBootstrapService.class);

    private final JdbcTemplate jdbcTemplate;
    private final PasswordEncoder passwordEncoder;
    private final AppProperties properties;

    public AdminBootstrapService(JdbcTemplate jdbcTemplate, PasswordEncoder passwordEncoder, AppProperties properties) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.properties = properties;
    }

    @Override
    public void run(ApplicationArguments args) {
        AppProperties.BootstrapAdminProperties bootstrap = properties.getBootstrapAdmin();
        if (bootstrap == null || !bootstrap.isEnabled()) {
            return;
        }

        String email = normalizeEmail(bootstrap.getEmail());
        String password = normalizeValue(bootstrap.getPassword());
        String name = normalizeValue(bootstrap.getName());
        String role = normalizeRole(bootstrap.getRole());

        if (!StringUtils.hasText(email) || !StringUtils.hasText(password)) {
            logger.warn("Bootstrap admin is enabled but email/password is blank. Skipping admin bootstrap.");
            return;
        }

        if (!StringUtils.hasText(name)) {
            name = "admin";
        }

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
            """
                SELECT id, password_hash, name, role, is_active
                FROM admins
                WHERE LOWER(email) = ?
                LIMIT 1
                """,
            email
        );

        if (rows.isEmpty()) {
            jdbcTemplate.update(
                """
                    INSERT INTO admins (
                        email,
                        password_hash,
                        name,
                        role,
                        is_active
                    ) VALUES (?, ?, ?, ?, TRUE)
                    """,
                email,
                passwordEncoder.encode(password),
                name,
                role
            );
            logger.info("Bootstrapped default admin account '{}'.", email);
            return;
        }

        Map<String, Object> row = rows.getFirst();
        String passwordHash = stringValue(row.get("password_hash"));
        String existingName = stringValue(row.get("name"));
        String existingRole = normalizeRole(stringValue(row.get("role")));
        boolean active = booleanValue(row.get("is_active"));

        if (passwordEncoder.matches(password, passwordHash) && name.equals(existingName) && role.equals(existingRole) && active) {
            return;
        }

        jdbcTemplate.update(
            """
                UPDATE admins
                SET password_hash = ?,
                    name = ?,
                    role = ?,
                    is_active = TRUE
                WHERE id = ?
                """,
            passwordEncoder.encode(password),
            name,
            role,
            longValue(row.get("id"))
        );
        logger.info("Updated default admin account '{}'.", email);
    }

    private String normalizeEmail(String value) {
        return normalizeValue(value).toLowerCase(Locale.ROOT);
    }

    private String normalizeValue(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeRole(String value) {
        String normalized = normalizeValue(value).toLowerCase(Locale.ROOT);
        return "manager".equals(normalized) ? "manager" : "super";
    }

    private String stringValue(Object value) {
        return value == null ? "" : value.toString();
    }

    private boolean booleanValue(Object value) {
        if (value instanceof Boolean booleanValue) {
            return booleanValue;
        }

        if (value instanceof Number number) {
            return number.intValue() != 0;
        }

        return "true".equalsIgnoreCase(stringValue(value)) || "1".equals(stringValue(value));
    }

    private long longValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }

        return Long.parseLong(stringValue(value));
    }
}
