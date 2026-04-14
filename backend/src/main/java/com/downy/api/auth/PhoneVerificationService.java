package com.downy.api.auth;

import com.downy.api.common.ApiException;
import com.downy.api.common.RequestMeta;
import com.downy.api.config.AppProperties;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sns.SnsClient;
import software.amazon.awssdk.services.sns.model.MessageAttributeValue;
import software.amazon.awssdk.services.sns.model.PublishRequest;

@Service
public class PhoneVerificationService {

    private static final Logger log = LoggerFactory.getLogger(PhoneVerificationService.class);

    private final JdbcTemplate jdbcTemplate;
    private final AppProperties properties;
    private final SnsClient snsClient;
    private final SecureRandom secureRandom = new SecureRandom();

    public PhoneVerificationService(JdbcTemplate jdbcTemplate, AppProperties properties) {
        this.jdbcTemplate = jdbcTemplate;
        this.properties = properties;

        var builder = SnsClient.builder()
            .region(Region.of(properties.getPhoneVerification().getRegion()));

        if (StringUtils.hasText(properties.getPhoneVerification().getAccessKeyId()) && StringUtils.hasText(properties.getPhoneVerification().getSecretAccessKey())) {
            builder.credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(
                        properties.getPhoneVerification().getAccessKeyId(),
                        properties.getPhoneVerification().getSecretAccessKey()
                    )
                )
            );
        } else if (StringUtils.hasText(properties.getS3().getAccessKeyId()) && StringUtils.hasText(properties.getS3().getSecretAccessKey())) {
            builder.credentialsProvider(
                StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(properties.getS3().getAccessKeyId(), properties.getS3().getSecretAccessKey())
                )
            );
        } else {
            builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        this.snsClient = builder.build();
    }

    public StartPhoneVerificationResult startSignupVerification(String rawPhone, RequestMeta requestMeta) {
        ensureEnabled();
        String normalizedPhone = normalizePhone(rawPhone);
        ensurePhoneAvailable(normalizedPhone);
        ensureCooldown(normalizedPhone);

        jdbcTemplate.update(
            """
                DELETE FROM phone_verification_challenges
                WHERE phone_normalized = ?
                  AND purpose = 'signup'
                  AND consumed_at IS NULL
                """,
            normalizedPhone
        );

        String verificationKey = UUID.randomUUID().toString();
        String verificationCode = generateCode(properties.getPhoneVerification().getCodeLength());
        Instant expiresAt = Instant.now().plusSeconds(properties.getPhoneVerification().getExpiresMinutes() * 60L);

        jdbcTemplate.update(
            """
                INSERT INTO phone_verification_challenges (
                    verification_key,
                    purpose,
                    phone_normalized,
                    verification_code,
                    request_ip,
                    user_agent,
                    expires_at
                ) VALUES (?, 'signup', ?, ?, ?, ?, ?)
                """,
            verificationKey,
            normalizedPhone,
            verificationCode,
            blankToNull(requestMeta.ip()),
            blankToNull(requestMeta.userAgent()),
            Timestamp.from(expiresAt)
        );

        try {
            sendVerificationCode(normalizedPhone, verificationCode);
        } catch (RuntimeException exception) {
            jdbcTemplate.update("DELETE FROM phone_verification_challenges WHERE verification_key = ?", verificationKey);
            throw exception;
        }

        return new StartPhoneVerificationResult(true, verificationKey, properties.getPhoneVerification().getExpiresMinutes() * 60L);
    }

    public ConfirmPhoneVerificationResult confirmSignupVerification(String rawPhone, String verificationKey, String rawCode) {
        ensureEnabled();
        String normalizedPhone = normalizePhone(rawPhone);
        ensurePhoneAvailable(normalizedPhone);
        VerificationChallenge challenge = requireChallenge(verificationKey, normalizedPhone);

        if (challenge.expiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "인증번호가 만료되었어요. 다시 요청해 주세요.");
        }

        if (!challenge.verificationCode().equals(rawCode == null ? "" : rawCode.trim())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "인증번호를 다시 확인해 주세요.");
        }

        if (challenge.verifiedAt() == null) {
            jdbcTemplate.update(
                """
                    UPDATE phone_verification_challenges
                    SET verified_at = ?
                    WHERE verification_key = ?
                    """,
                Timestamp.from(Instant.now()),
                verificationKey
            );
        }

        return new ConfirmPhoneVerificationResult(true);
    }

    public VerifiedPhoneClaim requireVerifiedSignupPhone(String rawPhone, String verificationKey) {
        ensureEnabled();
        String normalizedPhone = normalizePhone(rawPhone);
        ensurePhoneAvailable(normalizedPhone);
        VerificationChallenge challenge = requireChallenge(verificationKey, normalizedPhone);

        if (challenge.expiresAt().isBefore(Instant.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "전화번호 인증이 만료되었어요. 다시 인증해 주세요.");
        }

        if (challenge.verifiedAt() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "전화번호 인증을 먼저 완료해 주세요.");
        }

        if (challenge.consumedAt() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "이미 사용된 전화번호 인증입니다. 다시 인증해 주세요.");
        }

        return new VerifiedPhoneClaim(normalizedPhone, challenge.verifiedAt());
    }

    public void markSignupVerificationConsumed(String verificationKey, long userId) {
        jdbcTemplate.update(
            """
                UPDATE phone_verification_challenges
                SET consumed_at = ?, consumed_by_user_id = ?
                WHERE verification_key = ?
                """,
            Timestamp.from(Instant.now()),
            userId,
            verificationKey
        );
    }

    public String formatPhoneForStorage(String normalizedPhone) {
        if (normalizedPhone.length() == 11) {
            return normalizedPhone.substring(0, 3) + "-" + normalizedPhone.substring(3, 7) + "-" + normalizedPhone.substring(7);
        }

        if (normalizedPhone.length() == 10) {
            return normalizedPhone.substring(0, 3) + "-" + normalizedPhone.substring(3, 6) + "-" + normalizedPhone.substring(6);
        }

        return normalizedPhone;
    }

    private void sendVerificationCode(String normalizedPhone, String verificationCode) {
        Map<String, MessageAttributeValue> messageAttributes = new HashMap<>();
        messageAttributes.put(
            "AWS.SNS.SMS.SMSType",
            MessageAttributeValue.builder().dataType("String").stringValue("Transactional").build()
        );

        if (StringUtils.hasText(properties.getPhoneVerification().getSenderId())) {
            messageAttributes.put(
                "AWS.SNS.SMS.SenderID",
                MessageAttributeValue.builder().dataType("String").stringValue(properties.getPhoneVerification().getSenderId()).build()
            );
        }

        try {
            snsClient.publish(
                PublishRequest.builder()
                    .phoneNumber(toE164PhoneNumber(normalizedPhone))
                    .message("[다우니] 전화번호 인증번호는 " + verificationCode + " 입니다. " + properties.getPhoneVerification().getExpiresMinutes() + "분 안에 입력해 주세요.")
                    .messageAttributes(messageAttributes)
                    .build()
            );
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "인증번호 전송에 실패했어요. 잠시 후 다시 시도해 주세요.");
        }
    }

    private void ensureCooldown(String normalizedPhone) {
        Instant cutoff = Instant.now().minusSeconds(properties.getPhoneVerification().getRequestCooldownSeconds());
        Integer recentCount = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM phone_verification_challenges
                WHERE phone_normalized = ?
                  AND purpose = 'signup'
                  AND created_at >= ?
                  AND consumed_at IS NULL
                """,
            Integer.class,
            normalizedPhone,
            Timestamp.from(cutoff)
        );

        if (recentCount != null && recentCount > 0) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "인증번호는 잠시 후 다시 요청해 주세요.");
        }
    }

    private VerificationChallenge requireChallenge(String verificationKey, String normalizedPhone) {
        VerificationChallenge challenge = jdbcTemplate.query(
            """
                SELECT
                    verification_key,
                    phone_normalized,
                    verification_code,
                    expires_at,
                    verified_at,
                    consumed_at
                FROM phone_verification_challenges
                WHERE verification_key = ?
                  AND phone_normalized = ?
                  AND purpose = 'signup'
                LIMIT 1
                """,
            (rs, rowNum) -> new VerificationChallenge(
                rs.getString("verification_key"),
                rs.getString("phone_normalized"),
                rs.getString("verification_code"),
                rs.getTimestamp("expires_at").toInstant(),
                rs.getTimestamp("verified_at") == null ? null : rs.getTimestamp("verified_at").toInstant(),
                rs.getTimestamp("consumed_at") == null ? null : rs.getTimestamp("consumed_at").toInstant()
            ),
            verificationKey,
            normalizedPhone
        ).stream().findFirst().orElse(null);

        if (challenge == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "유효한 전화번호 인증 요청을 찾지 못했어요. 다시 인증해 주세요.");
        }

        return challenge;
    }

    private void ensurePhoneAvailable(String normalizedPhone) {
        Integer existingUsers = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM users
                WHERE phone_normalized = ?
                   OR REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), '-', ''), ' ', ''), '(', ''), ')', ''), '+', ''), '.', '') = ?
                """,
            Integer.class,
            normalizedPhone,
            normalizedPhone
        );

        if (existingUsers != null && existingUsers > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "이미 가입된 전화번호입니다.");
        }
    }

    private void ensureEnabled() {
        if (!properties.getPhoneVerification().isEnabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "전화번호 인증이 현재 비활성화되어 있어요.");
        }
    }

    private String toE164PhoneNumber(String normalizedPhone) {
        return "+82" + normalizedPhone.substring(1);
    }

    private String normalizePhone(String value) {
        String digitsOnly = value == null ? "" : value.replaceAll("\\D", "");

        if (digitsOnly.startsWith("82")) {
            digitsOnly = "0" + digitsOnly.substring(2);
        }

        if (!digitsOnly.matches("^0\\d{9,10}$")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "휴대전화 번호를 다시 확인해 주세요.");
        }

        return digitsOnly;
    }

    private String generateCode(int codeLength) {
        int safeLength = Math.max(4, Math.min(codeLength, 8));
        StringBuilder builder = new StringBuilder(safeLength);
        for (int index = 0; index < safeLength; index++) {
            builder.append(secureRandom.nextInt(10));
        }
        return builder.toString();
    }

    private String blankToNull(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private record VerificationChallenge(
        String verificationKey,
        String phoneNormalized,
        String verificationCode,
        Instant expiresAt,
        Instant verifiedAt,
        Instant consumedAt
    ) {
    }

    public record StartPhoneVerificationResult(boolean ok, String verificationKey, long expiresInSeconds) {
    }

    public record ConfirmPhoneVerificationResult(boolean ok) {
    }

    public record VerifiedPhoneClaim(String normalizedPhone, Instant verifiedAt) {
    }
}
