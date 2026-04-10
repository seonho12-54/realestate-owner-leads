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
        private Boolean secure;

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

        public Boolean getSecure() {
            return secure;
        }

        public void setSecure(Boolean secure) {
            this.secure = secure;
        }
    }
}
