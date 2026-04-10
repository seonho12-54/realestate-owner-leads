package com.downy.api.auth;

import com.downy.api.auth.SessionModels.UserSession;
import com.downy.api.common.RequestMeta;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/profile")
public class MyProfileController {

    private final SessionService sessionService;
    private final UserProfileService userProfileService;

    public MyProfileController(SessionService sessionService, UserProfileService userProfileService) {
        this.sessionService = sessionService;
        this.userProfileService = userProfileService;
    }

    @GetMapping
    public UserProfileService.ProfileResponse profile(HttpServletRequest request) {
        UserSession session = sessionService.requireUser(request);
        return userProfileService.getProfile(session.userId());
    }

    @PostMapping("/verify-password")
    public VerifyPasswordResponse verifyPassword(@Valid @RequestBody VerifyPasswordRequest request, HttpServletRequest httpRequest) {
        UserSession session = sessionService.requireUser(httpRequest);
        userProfileService.verifyPassword(session.userId(), request.password());
        return new VerifyPasswordResponse(true);
    }

    @PatchMapping
    public UserProfileService.ProfileResponse update(
        @Valid @RequestBody UpdateProfileRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse response
    ) {
        UserSession session = sessionService.requireUser(httpRequest);
        UserProfileService.UserSessionPayload updated = userProfileService.updateProfile(
            session.userId(),
            new UserProfileService.UpdateProfileCommand(
                request.name(),
                request.email(),
                request.currentPassword(),
                request.newPassword()
            ),
            RequestMeta.from(httpRequest)
        );

        sessionService.setUserSession(
            response,
            updated.userId(),
            updated.email(),
            updated.name(),
            updated.verifiedRegionSlug(),
            updated.verifiedRegionName(),
            updated.locationLocked(),
            updated.regionVerifiedAt()
        );

        return userProfileService.getProfile(updated.userId());
    }

    public record VerifyPasswordRequest(@NotBlank @Size(max = 128) String password) {
    }

    public record VerifyPasswordResponse(boolean ok) {
    }

    public record UpdateProfileRequest(
        @NotBlank @Size(min = 2, max = 100) String name,
        @NotBlank @Email @Size(max = 191) String email,
        @NotBlank @Size(max = 128) String currentPassword,
        @Size(max = 128) String newPassword
    ) {
    }
}
