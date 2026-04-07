package com.downy.api.office;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/offices")
public class OfficeController {

    private final JdbcTemplate jdbcTemplate;

    public OfficeController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public List<OfficeResponse> list() {
        return jdbcTemplate.query(
            """
                SELECT id, name, phone
                FROM offices
                WHERE is_active = 1
                ORDER BY id ASC
                """,
            (rs, rowNum) -> new OfficeResponse(
                rs.getLong("id"),
                rs.getString("name"),
                rs.getString("phone")
            )
        );
    }

    public record OfficeResponse(long id, String name, String phone) {
    }
}
