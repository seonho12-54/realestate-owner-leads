package com.downy.api.s3;

import com.downy.api.common.ApiException;
import com.downy.api.config.AppProperties;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class S3Service {

    private final AppProperties properties;
    private final HttpClient httpClient;

    public S3Service(AppProperties properties) {
        this.properties = properties;
        this.httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(15))
            .build();
    }

    public String createObjectKey(String fileName) {
        requireConfigured();
        String sanitized = fileName.replaceAll("[^a-zA-Z0-9.\\-_]", "-").replaceAll("-{2,}", "-").toLowerCase(Locale.ROOT);
        String datePrefix = LocalDate.now().toString();
        return properties.getS3().getUploadPrefix() + "/" + datePrefix + "/" + UUID.randomUUID() + "-" + sanitized;
    }

    public void uploadObject(String key, String contentType, byte[] bytes) {
        requireConfigured();
        URI storageUri = buildStorageObjectUri(normalizeObjectPath(key));
        HttpRequest.BodyPublisher bodyPublisher = HttpRequest.BodyPublishers.ofByteArray(bytes);
        HttpResponse<String> response = send(buildUploadRequest(storageUri, contentType, bodyPublisher, "POST"));

        if (response.statusCode() != 200 && response.statusCode() != 201) {
            response = send(buildUploadRequest(storageUri, contentType, HttpRequest.BodyPublishers.ofByteArray(bytes), "PUT"));
        }

        if (response.statusCode() != 200 && response.statusCode() != 201) {
            throw new ApiException(
                HttpStatus.BAD_GATEWAY,
                "Supabase Storage upload failed (" + response.statusCode() + "). " + trimBody(response.body())
            );
        }
    }

    public String createPresignedViewUrl(String key) {
        requireConfigured();

        if (!properties.getSupabase().isPublicBucket()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Supabase storage bucket must be public for photo rendering.");
        }

        return buildPublicObjectUri(normalizeObjectPath(key)).toString();
    }

    private URI buildStorageObjectUri(String objectPath) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(normalizeBaseUrl())
            .pathSegment("storage", "v1", "object", requireBucket());

        for (String segment : objectPath.split("/")) {
            if (StringUtils.hasText(segment)) {
                builder.pathSegment(segment);
            }
        }

        return builder.build().toUri();
    }

    private HttpRequest buildUploadRequest(URI storageUri, String contentType, HttpRequest.BodyPublisher bodyPublisher, String method) {
        return HttpRequest.newBuilder(storageUri)
            .timeout(Duration.ofMinutes(2))
            .header("Authorization", "Bearer " + properties.getSupabase().getServiceRoleKey())
            .header("apikey", properties.getSupabase().getServiceRoleKey())
            .header("x-upsert", "true")
            .header("Content-Type", StringUtils.hasText(contentType) ? contentType : "application/octet-stream")
            .method(method, bodyPublisher)
            .build();
    }

    private URI buildPublicObjectUri(String objectPath) {
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(normalizeBaseUrl())
            .pathSegment("storage", "v1", "object", "public", requireBucket());

        for (String segment : objectPath.split("/")) {
            if (StringUtils.hasText(segment)) {
                builder.pathSegment(segment);
            }
        }

        return builder.build().toUri();
    }

    private HttpResponse<String> send(HttpRequest request) {
        try {
            return httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            throw new ApiException(HttpStatus.BAD_GATEWAY, "Failed to reach Supabase Storage.");
        }
    }

    private String normalizeObjectPath(String key) {
        String normalized = key == null ? "" : key.trim();
        while (normalized.startsWith("/")) {
            normalized = normalized.substring(1);
        }

        String uploadPrefix = properties.getS3().getUploadPrefix();
        if (StringUtils.hasText(uploadPrefix) && normalized.startsWith(uploadPrefix + "/")) {
            return normalized.substring(uploadPrefix.length() + 1);
        }

        String bucket = properties.getSupabase().getStorageBucket();
        if (StringUtils.hasText(bucket) && normalized.startsWith(bucket + "/")) {
            return normalized.substring(bucket.length() + 1);
        }

        return normalized;
    }

    private String normalizeBaseUrl() {
        String baseUrl = properties.getSupabase().getUrl();
        if (!StringUtils.hasText(baseUrl)) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SUPABASE_URL is missing.");
        }
        return baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    private String requireBucket() {
        String bucket = properties.getSupabase().getStorageBucket();
        if (!StringUtils.hasText(bucket)) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SUPABASE_STORAGE_BUCKET is missing.");
        }
        return bucket;
    }

    private void requireConfigured() {
        if (!StringUtils.hasText(properties.getSupabase().getServiceRoleKey())) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SUPABASE_SERVICE_ROLE_KEY is missing.");
        }
        requireBucket();
        normalizeBaseUrl();
    }

    private String trimBody(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.length() <= 240 ? trimmed : trimmed.substring(0, 240);
    }

    public record PresignedUpload(String key, String uploadUrl) {
    }
}
