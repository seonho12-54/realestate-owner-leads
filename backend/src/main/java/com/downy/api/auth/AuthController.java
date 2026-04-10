package com.downy.api.auth;

import com.downy.api.common.RequestMeta;
import com.downy.api.location.RegionAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final SessionService sessionService;
    private final RegionAccessService regionAccessService;

    public AuthController(AuthService authService, SessionService sessionService, RegionAccessService regionAccessService) {
        this.authService = authService;
        this.sessionService = sessionService;
        this.regionAccessService = regionAccessService;
    }

    @PostMapping("/signup")
    public Map<String, Object> signup(@Valid @RequestBody SignupRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        var session = authService.signup(
            new AuthService.UserSignupRequest(request.name(), request.email(), request.phone(), request.password()),
            RequestMeta.from(httpRequest)
        );
        var synced = regionAccessService.syncAuthenticatedRegion(session, httpRequest);
        sessionService.clearAdminSession(response);
        String accessToken = sessionService.setUserSession(
            response,
            synced.userId(),
            synced.email(),
            synced.name(),
            synced.verifiedRegionSlug(),
            synced.verifiedRegionName(),
            synced.locationLocked(),
            synced.regionVerifiedAt()
        );
        regionAccessService.writeRegionCookie(response, synced);
        return Map.of("ok", true, "kind", "user", "accessToken", accessToken, "userId", synced.userId());
    }

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        var result = authService.login(new AuthService.UserLoginRequest(request.email(), request.password()), RequestMeta.from(httpRequest));

        if ("admin".equals(result.kind())) {
            var session = result.adminSession();
            sessionService.clearUserSession(response);
            String accessToken = sessionService.setAdminSession(response, session.adminId(), session.officeId(), session.email(), session.name(), session.role());
            return Map.of("ok", true, "kind", "admin", "accessToken", accessToken);
        }

        var synced = regionAccessService.syncAuthenticatedRegion(result.userSession(), httpRequest);
        sessionService.clearAdminSession(response);
        String accessToken = sessionService.setUserSession(
            response,
            synced.userId(),
            synced.email(),
            synced.name(),
            synced.verifiedRegionSlug(),
            synced.verifiedRegionName(),
            synced.locationLocked(),
            synced.regionVerifiedAt()
        );
        regionAccessService.writeRegionCookie(response, synced);
        return Map.of("ok", true, "kind", "user", "accessToken", accessToken);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletResponse response) {
        sessionService.clearUserSession(response);
        sessionService.clearAdminSession(response);
        return Map.of("ok", true);
    }

    public record SignupRequest(
        @NotBlank @Size(min = 2, max = 100) String name,
        @NotBlank @Email @Size(max = 191) String email,
        @Size(max = 30) String phone,
        @NotBlank @Size(min = 8, max = 128) @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "비밀번호는 영문과 숫자를 모두 포함해야 합니다.") String password
    ) {
    }

    public record LoginRequest(
        @NotBlank @Email String email,
        @NotBlank @Size(min = 8, max = 128) String password
    ) {
    }
}
