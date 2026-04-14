package com.downy.api.s3;

import com.downy.api.auth.SessionService;
import com.downy.api.common.ApiException;
import com.downy.api.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Locale;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {

    private static final List<String> ALLOWED_TYPES = List.of("image/jpeg", "image/png", "image/webp", "image/heic", "image/heif");

    private final SessionService sessionService;
    private final S3Service s3Service;
    private final AppProperties properties;

    public UploadController(SessionService sessionService, S3Service s3Service, AppProperties properties) {
        this.sessionService = sessionService;
        this.s3Service = s3Service;
        this.properties = properties;
    }

    @PostMapping("/presign")
    public S3Service.PresignedUpload presign(@Valid @RequestBody PresignRequest request, HttpServletRequest httpRequest) {
        ensureAuthenticated(httpRequest);
        validateUploadRequest(normalizeContentType(request.contentType()), request.fileSize());

        String key = s3Service.createObjectKey(request.fileName());
        String uploadUrl = ServletUriComponentsBuilder.fromRequestUri(httpRequest)
            .replacePath("/api/uploads/object")
            .replaceQueryParam("key", key)
            .build()
            .toUriString();

        return new S3Service.PresignedUpload(key, uploadUrl);
    }

    @PutMapping(value = "/object", consumes = MediaType.ALL_VALUE)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void uploadObject(
        @RequestParam @NotBlank @Size(max = 500) String key,
        @RequestHeader(value = "Content-Type", required = false) String contentType,
        @RequestBody byte[] body,
        HttpServletRequest httpRequest
    ) {
        ensureAuthenticated(httpRequest);

        String resolvedContentType = normalizeContentType(contentType);
        validateUploadRequest(resolvedContentType, body.length);

        if (body.length == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Empty uploads are not allowed.");
        }

        s3Service.uploadObject(key, resolvedContentType, body);
    }

    private void ensureAuthenticated(HttpServletRequest httpRequest) {
        if (!sessionService.hasUserOrAdmin(httpRequest)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }
    }

    private void validateUploadRequest(String contentType, long fileSize) {
        if (!ALLOWED_TYPES.contains(contentType)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "지원하지 않는 이미지 형식입니다.");
        }

        long maxBytes = properties.getMaxPhotoSizeMb() * 1024L * 1024L;
        if (fileSize > maxBytes) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "사진 1장당 최대 " + properties.getMaxPhotoSizeMb() + "MB까지 업로드할 수 있습니다.");
        }
    }

    private String normalizeContentType(String contentType) {
        if (contentType == null) {
            return "";
        }

        return contentType.split(";", 2)[0].trim().toLowerCase(Locale.ROOT);
    }

    public record PresignRequest(
        @NotBlank @Size(max = 255) String fileName,
        @NotBlank String contentType,
        @Positive long fileSize
    ) {
    }
}
