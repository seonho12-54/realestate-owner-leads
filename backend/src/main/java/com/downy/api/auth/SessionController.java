package com.downy.api.auth;

import com.downy.api.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class SessionController {

    private final SessionService sessionService;
    private final AuthService authService;
    private final AppProperties properties;

    public SessionController(SessionService sessionService, AuthService authService, AppProperties properties) {
        this.sessionService = sessionService;
        this.authService = authService;
        this.properties = properties;
    }

    @GetMapping("/session")
    public AuthService.CurrentSessionResponse session(HttpServletRequest request) {
        var adminSession = sessionService.readAdminSession(request);
        var userSession = sessionService.readUserSession(request);
        return authService.snapshot(adminSession, userSession, properties.getKakaoJsKey());
    }
}
