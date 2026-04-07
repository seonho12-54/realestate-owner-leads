package com.downy.api.s3;

import com.downy.api.common.ApiException;
import com.downy.api.config.AppProperties;
import java.net.URL;
import java.time.Duration;
import java.time.LocalDate;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Service
public class S3Service {

    private final AppProperties properties;
    private final S3Presigner presigner;

    public S3Service(AppProperties properties) {
        this.properties = properties;

        S3Presigner.Builder builder = S3Presigner.builder()
            .region(Region.of(properties.getS3().getRegion()));

        if (StringUtils.hasText(properties.getS3().getAccessKeyId()) && StringUtils.hasText(properties.getS3().getSecretAccessKey())) {
            builder.credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(properties.getS3().getAccessKeyId(), properties.getS3().getSecretAccessKey())
                )
            );
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        this.presigner = builder.build();
    }

    public PresignedUpload createPresignedUpload(String fileName, String contentType) {
        String bucket = requireBucket();
        String key = buildKey(fileName);

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
            .bucket(bucket)
            .key(key)
            .contentType(contentType)
            .build();

        PresignedPutObjectRequest presignedRequest = presigner.presignPutObject(
            PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(5))
                .putObjectRequest(putObjectRequest)
                .build()
        );

        return new PresignedUpload(key, presignedRequest.url());
    }

    public String createPresignedViewUrl(String key) {
        String bucket = requireBucket();
        PresignedGetObjectRequest presignedRequest = presigner.presignGetObject(
            GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(10))
                .getObjectRequest(GetObjectRequest.builder().bucket(bucket).key(key).build())
                .build()
        );
        return presignedRequest.url().toString();
    }

    private String buildKey(String fileName) {
        String sanitized = fileName.replaceAll("[^a-zA-Z0-9.\\-_]", "-").replaceAll("-{2,}", "-").toLowerCase(Locale.ROOT);
        String datePrefix = LocalDate.now().toString();
        return properties.getS3().getUploadPrefix() + "/" + datePrefix + "/" + UUID.randomUUID() + "-" + sanitized;
    }

    private String requireBucket() {
        if (!StringUtils.hasText(properties.getS3().getBucket())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "S3_BUCKET is missing.");
        }
        return properties.getS3().getBucket();
    }

    public record PresignedUpload(String key, URL uploadUrl) {
    }
}
