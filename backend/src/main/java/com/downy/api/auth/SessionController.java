package com.downy.api.auth;

import com.downy.api.config.AppProperties;
import com.downy.api.location.RegionAccessService;
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
    private final RegionAccessService regionAccessService;

    public SessionController(
        SessionService sessionService,
        AuthService authService,
        AppProperties properties,
        RegionAccessService regionAccessService
    ) {
        this.sessionService = sessionService;
        this.authService = authService;
        this.properties = properties;
        this.regionAccessService = regionAccessService;
    }

    @GetMapping("/session")
    public AuthService.CurrentSessionResponse session(HttpServletRequest request) {
        var adminSession = sessionService.readAdminSession(request);
        var userSession = sessionService.readUserSession(request);
        return authService.snapshot(
            adminSession,
            userSession,
            properties.getKakaoJsKey(),
            regionAccessService.getRegionStatus(request)
        );
    }
}
