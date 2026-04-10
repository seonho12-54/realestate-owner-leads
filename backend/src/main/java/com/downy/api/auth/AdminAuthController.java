package com.downy.api.auth;

import com.downy.api.common.RequestMeta;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin")
public class AdminAuthController {

    private final AuthService authService;
    private final SessionService sessionService;

    public AdminAuthController(AuthService authService, SessionService sessionService) {
        this.authService = authService;
        this.sessionService = sessionService;
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody AdminLoginRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        var session = authService.loginAdmin(new AuthService.AdminLoginRequest(request.email(), request.password()), RequestMeta.from(httpRequest));
        sessionService.clearUserSession(response);
        String accessToken = sessionService.setAdminSession(response, session.adminId(), session.officeId(), session.email(), session.name(), session.role());
        return Map.of("ok", true, "kind", "admin", "accessToken", accessToken);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletResponse response) {
        sessionService.clearAdminSession(response);
        sessionService.clearUserSession(response);
        return Map.of("ok", true);
    }

    public record AdminLoginRequest(
        @NotBlank @Size(max = 191) String email,
        @NotBlank @Size(min = 8, max = 128) String password
    ) {
    }
}
