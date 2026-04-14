package com.downy.api.auth;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.downy.api.config.AppProperties;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class AdminBootstrapServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AdminBootstrapService adminBootstrapService;

    @BeforeEach
    void setUp() {
        AppProperties properties = new AppProperties();
        AppProperties.BootstrapAdminProperties bootstrapAdmin = new AppProperties.BootstrapAdminProperties();
        bootstrapAdmin.setEnabled(true);
        bootstrapAdmin.setEmail("admin@downy.local");
        bootstrapAdmin.setPassword("admin");
        bootstrapAdmin.setName("admin");
        bootstrapAdmin.setRole("super");
        properties.setBootstrapAdmin(bootstrapAdmin);
        adminBootstrapService = new AdminBootstrapService(jdbcTemplate, passwordEncoder, properties);
    }

    @Test
    void insertsDefaultAdminWhenMissing() throws Exception {
        when(jdbcTemplate.queryForList(anyString(), eq("admin@downy.local"))).thenReturn(List.of());
        when(passwordEncoder.encode("admin")).thenReturn("encoded-admin");

        adminBootstrapService.run(null);

        verify(jdbcTemplate).update(anyString(), eq("admin@downy.local"), eq("encoded-admin"), eq("admin"), eq("super"));
    }

    @Test
    void skipsUpdateWhenAdminAlreadyMatchesConfiguredCredentials() throws Exception {
        when(jdbcTemplate.queryForList(anyString(), eq("admin@downy.local")))
            .thenReturn(List.of(Map.of(
                "id", 7L,
                "password_hash", "encoded-admin",
                "name", "admin",
                "role", "super",
                "is_active", 1
            )));
        when(passwordEncoder.matches("admin", "encoded-admin")).thenReturn(true);

        adminBootstrapService.run(null);

        verify(passwordEncoder, never()).encode("admin");
        verify(jdbcTemplate, never()).update(anyString(), eq("encoded-admin"), eq("admin"), eq("super"), eq(7L));
    }
}
