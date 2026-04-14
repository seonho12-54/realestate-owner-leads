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
    private final PhoneVerificationService phoneVerificationService;

    public AuthController(
        AuthService authService,
        SessionService sessionService,
        RegionAccessService regionAccessService,
        PhoneVerificationService phoneVerificationService
    ) {
        this.authService = authService;
        this.sessionService = sessionService;
        this.regionAccessService = regionAccessService;
        this.phoneVerificationService = phoneVerificationService;
    }

    @PostMapping("/phone-verification/request")
    public PhoneVerificationRequestResponse requestPhoneVerification(
        @Valid @RequestBody PhoneVerificationRequest request,
        HttpServletRequest httpRequest
    ) {
        PhoneVerificationService.StartPhoneVerificationResult result = phoneVerificationService.startSignupVerification(
            request.phone(),
            RequestMeta.from(httpRequest)
        );
        return new PhoneVerificationRequestResponse(result.ok(), result.verificationKey(), result.expiresInSeconds());
    }

    @PostMapping("/phone-verification/confirm")
    public Map<String, Object> confirmPhoneVerification(@Valid @RequestBody PhoneVerificationConfirmRequest request) {
        PhoneVerificationService.ConfirmPhoneVerificationResult result = phoneVerificationService.confirmSignupVerification(
            request.phone(),
            request.verificationKey(),
            request.code()
        );
        return Map.of("ok", result.ok());
    }

    @PostMapping("/signup")
    public Map<String, Object> signup(@Valid @RequestBody SignupRequest request, HttpServletRequest httpRequest, HttpServletResponse response) {
        var session = authService.signup(
            new AuthService.UserSignupRequest(request.name(), request.email(), request.phone(), request.password(), request.phoneVerificationKey()),
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

    public record PhoneVerificationRequest(
        @NotBlank @Size(min = 10, max = 30) @Pattern(regexp = "^[0-9+\\-() ]+$", message = "휴대전화 번호를 확인해 주세요.") String phone
    ) {
    }

    public record PhoneVerificationConfirmRequest(
        @NotBlank @Size(min = 10, max = 30) @Pattern(regexp = "^[0-9+\\-() ]+$", message = "휴대전화 번호를 확인해 주세요.") String phone,
        @NotBlank @Size(max = 64) String verificationKey,
        @NotBlank @Pattern(regexp = "^\\d{4,8}$", message = "인증번호를 확인해 주세요.") String code
    ) {
    }

    public record PhoneVerificationRequestResponse(boolean ok, String verificationKey, long expiresInSeconds) {
    }

    public record SignupRequest(
        @NotBlank @Size(min = 2, max = 100) String name,
        @NotBlank @Email @Size(max = 191) String email,
        @NotBlank @Size(min = 10, max = 30) @Pattern(regexp = "^[0-9+\\-() ]+$", message = "휴대전화 번호를 확인해 주세요.") String phone,
        @NotBlank @Size(max = 64) String phoneVerificationKey,
        @NotBlank @Size(min = 8, max = 128) @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "비밀번호는 영문과 숫자를 모두 포함해야 합니다.") String password
    ) {
    }

    public record LoginRequest(
        @NotBlank @Size(max = 191) String email,
        @NotBlank @Size(max = 128) String password
    ) {
    }
}
