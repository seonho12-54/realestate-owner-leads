package com.downy.api.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String baseUrl;
    private String adminSessionSecret;
    private String userSessionSecret;
    private int sessionDurationDays = 14;
    private String kakaoRestApiKey;
    private String kakaoJsKey;
    private int maxPhotoSizeMb = 20;
    private int maxPhotoCount = 10;
    private S3Properties s3 = new S3Properties();
    private CorsProperties cors = new CorsProperties();
    private CookieProperties cookie = new CookieProperties();
    private BootstrapAdminProperties bootstrapAdmin = new BootstrapAdminProperties();
    private PhoneVerificationProperties phoneVerification = new PhoneVerificationProperties();

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public String getAdminSessionSecret() {
        return adminSessionSecret;
    }

    public void setAdminSessionSecret(String adminSessionSecret) {
        this.adminSessionSecret = adminSessionSecret;
    }

    public String getUserSessionSecret() {
        return userSessionSecret;
    }

    public void setUserSessionSecret(String userSessionSecret) {
        this.userSessionSecret = userSessionSecret;
    }

    public int getSessionDurationDays() {
        return sessionDurationDays;
    }

    public void setSessionDurationDays(int sessionDurationDays) {
        this.sessionDurationDays = sessionDurationDays;
    }

    public String getKakaoRestApiKey() {
        return kakaoRestApiKey;
    }

    public void setKakaoRestApiKey(String kakaoRestApiKey) {
        this.kakaoRestApiKey = kakaoRestApiKey;
    }

    public String getKakaoJsKey() {
        return kakaoJsKey;
    }

    public void setKakaoJsKey(String kakaoJsKey) {
        this.kakaoJsKey = kakaoJsKey;
    }

    public int getMaxPhotoSizeMb() {
        return maxPhotoSizeMb;
    }

    public void setMaxPhotoSizeMb(int maxPhotoSizeMb) {
        this.maxPhotoSizeMb = maxPhotoSizeMb;
    }

    public int getMaxPhotoCount() {
        return maxPhotoCount;
    }

    public void setMaxPhotoCount(int maxPhotoCount) {
        this.maxPhotoCount = maxPhotoCount;
    }

    public S3Properties getS3() {
        return s3;
    }

    public void setS3(S3Properties s3) {
        this.s3 = s3;
    }

    public CorsProperties getCors() {
        return cors;
    }

    public void setCors(CorsProperties cors) {
        this.cors = cors;
    }

    public CookieProperties getCookie() {
        return cookie;
    }

    public void setCookie(CookieProperties cookie) {
        this.cookie = cookie;
    }

    public BootstrapAdminProperties getBootstrapAdmin() {
        return bootstrapAdmin;
    }

    public void setBootstrapAdmin(BootstrapAdminProperties bootstrapAdmin) {
        this.bootstrapAdmin = bootstrapAdmin;
    }

    public PhoneVerificationProperties getPhoneVerification() {
        return phoneVerification;
    }

    public void setPhoneVerification(PhoneVerificationProperties phoneVerification) {
        this.phoneVerification = phoneVerification;
    }

    public static class S3Properties {

        private String bucket;
        private String region;
        private String uploadPrefix = "leads";
        private String accessKeyId;
        private String secretAccessKey;

        public String getBucket() {
            return bucket;
        }

        public void setBucket(String bucket) {
            this.bucket = bucket;
        }

        public String getRegion() {
            return region;
        }

        public void setRegion(String region) {
            this.region = region;
        }

        public String getUploadPrefix() {
            return uploadPrefix;
        }

        public void setUploadPrefix(String uploadPrefix) {
            this.uploadPrefix = uploadPrefix;
        }

        public String getAccessKeyId() {
            return accessKeyId;
        }

        public void setAccessKeyId(String accessKeyId) {
            this.accessKeyId = accessKeyId;
        }

        public String getSecretAccessKey() {
            return secretAccessKey;
        }

        public void setSecretAccessKey(String secretAccessKey) {
            this.secretAccessKey = secretAccessKey;
        }
    }

    public static class CorsProperties {

        private List<String> allowedOrigins = List.of("http://localhost:5173");

        public List<String> getAllowedOrigins() {
            return allowedOrigins;
        }

        public void setAllowedOrigins(List<String> allowedOrigins) {
            this.allowedOrigins = allowedOrigins;
        }
    }

    public static class CookieProperties {

        private String sameSite = "Lax";
        private String domain;
        private String secure;

        public String getSameSite() {
            return sameSite;
        }

        public void setSameSite(String sameSite) {
            this.sameSite = sameSite;
        }

        public String getDomain() {
            return domain;
        }

        public void setDomain(String domain) {
            this.domain = domain;
        }

        public String getSecure() {
            return secure;
        }

        public void setSecure(String secure) {
            this.secure = secure;
        }
    }

    public static class BootstrapAdminProperties {

        private boolean enabled = true;
        private String email = "admin@downy.local";
        private String password = "admin";
        private String name = "admin";
        private String role = "super";

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }
    }

    public static class PhoneVerificationProperties {

        private boolean enabled = true;
        private String region = "ap-northeast-2";
        private String senderId;
        private String accessKeyId;
        private String secretAccessKey;
        private int codeLength = 6;
        private int expiresMinutes = 5;
        private int requestCooldownSeconds = 60;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getRegion() {
            return region;
        }

        public void setRegion(String region) {
            this.region = region;
        }

        public String getSenderId() {
            return senderId;
        }

        public void setSenderId(String senderId) {
            this.senderId = senderId;
        }

        public String getAccessKeyId() {
            return accessKeyId;
        }

        public void setAccessKeyId(String accessKeyId) {
            this.accessKeyId = accessKeyId;
        }

        public String getSecretAccessKey() {
            return secretAccessKey;
        }

        public void setSecretAccessKey(String secretAccessKey) {
            this.secretAccessKey = secretAccessKey;
        }

        public int getCodeLength() {
            return codeLength;
        }

        public void setCodeLength(int codeLength) {
            this.codeLength = codeLength;
        }

        public int getExpiresMinutes() {
            return expiresMinutes;
        }

        public void setExpiresMinutes(int expiresMinutes) {
            this.expiresMinutes = expiresMinutes;
        }

        public int getRequestCooldownSeconds() {
            return requestCooldownSeconds;
        }

        public void setRequestCooldownSeconds(int requestCooldownSeconds) {
            this.requestCooldownSeconds = requestCooldownSeconds;
        }
    }
}
