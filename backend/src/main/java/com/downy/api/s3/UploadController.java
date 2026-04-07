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
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
        if (!sessionService.hasUserOrAdmin(httpRequest)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        if (!ALLOWED_TYPES.contains(request.contentType())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "지원하지 않는 이미지 형식입니다.");
        }

        long maxBytes = properties.getMaxPhotoSizeMb() * 1024L * 1024L;
        if (request.fileSize() > maxBytes) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "사진 1장당 최대 " + properties.getMaxPhotoSizeMb() + "MB까지 업로드할 수 있습니다.");
        }

        return s3Service.createPresignedUpload(request.fileName(), request.contentType());
    }

    public record PresignRequest(
        @NotBlank @Size(max = 255) String fileName,
        @NotBlank String contentType,
        @Positive long fileSize
    ) {
    }
}
