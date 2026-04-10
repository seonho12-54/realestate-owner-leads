package com.downy.api.lead;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class LeadDtos {

    private LeadDtos() {
    }

    public record LeadPhotoInput(
        @NotBlank @Size(max = 500) String s3Key,
        @NotBlank @Size(max = 255) String fileName,
        @NotBlank @Size(max = 100) String contentType,
        @Positive long fileSize,
        @Min(0) int displayOrder
    ) {
    }

    public record CreateLeadRequest(
        @Positive long officeId,
        @NotBlank @Size(min = 4, max = 160) String listingTitle,
        @NotBlank @Size(min = 2, max = 100) String ownerName,
        @NotBlank @Size(min = 9, max = 30) @Pattern(regexp = "^[0-9+\\-() ]+$", message = "연락처 형식을 확인해 주세요.") String phone,
        @Email @Size(max = 191) String email,
        @NotBlank String propertyType,
        @NotBlank String transactionType,
        @NotBlank @Size(min = 5, max = 255) String addressLine1,
        @Size(max = 255) String addressLine2,
        @Size(max = 20) String postalCode,
        @Min(0) Double areaM2,
        @Min(0) Long priceKrw,
        @Min(0) Long depositKrw,
        @Min(0) Long monthlyRentKrw,
        @Size(max = 50) String moveInDate,
        @Size(max = 100) String contactTime,
        @Size(max = 3000) String description,
        boolean privacyConsent,
        boolean marketingConsent,
        @Size(max = 100) String utmSource,
        @Size(max = 100) String utmMedium,
        @Size(max = 100) String utmCampaign,
        @Size(max = 100) String utmTerm,
        @Size(max = 100) String utmContent,
        @Size(max = 500) String referrerUrl,
        @Size(max = 500) String landingUrl,
        @Min(33) @Max(39) Double browserLatitude,
        @Min(124) @Max(132) Double browserLongitude,
        @Valid List<LeadPhotoInput> photos
    ) {
        @AssertTrue(message = "개인정보 수집 및 이용 동의가 필요합니다.")
        public boolean isPrivacyConsentAccepted() {
            return privacyConsent;
        }
    }

    public record UserLeadUpdateRequest(
        @Positive long officeId,
        @NotBlank @Size(min = 4, max = 160) String listingTitle,
        @NotBlank @Size(min = 2, max = 100) String ownerName,
        @NotBlank @Size(min = 9, max = 30) @Pattern(regexp = "^[0-9+\\-() ]+$", message = "연락처 형식을 확인해 주세요.") String phone,
        @Email @Size(max = 191) String email,
        @NotBlank String propertyType,
        @NotBlank String transactionType,
        @NotBlank @Size(min = 5, max = 255) String addressLine1,
        @Size(max = 255) String addressLine2,
        @Size(max = 20) String postalCode,
        @Min(0) Double areaM2,
        @Min(0) Long priceKrw,
        @Min(0) Long depositKrw,
        @Min(0) Long monthlyRentKrw,
        @Size(max = 50) String moveInDate,
        @Size(max = 100) String contactTime,
        @Size(max = 3000) String description,
        @Min(33) @Max(39) Double browserLatitude,
        @Min(124) @Max(132) Double browserLongitude
    ) {
    }

    public record LeadPhotoAsset(long id, long leadId, String fileName, String s3Key, String viewUrl) {
    }

    public record PublicListingResponse(
        long id,
        String listingTitle,
        String propertyType,
        String transactionType,
        boolean isPreview,
        String regionSlug,
        String addressLine1,
        String addressLine2,
        String region3DepthName,
        Double areaM2,
        Long priceKrw,
        Long depositKrw,
        Long monthlyRentKrw,
        String description,
        double latitude,
        double longitude,
        Instant createdAt,
        String officeName,
        String officePhone,
        int photoCount,
        String previewPhotoUrl
    ) {
    }

    public record LeadDetailResponse(
        long id,
        String listingTitle,
        String propertyType,
        String transactionType,
        String regionSlug,
        String addressLine1,
        String addressLine2,
        String region3DepthName,
        Double areaM2,
        Long priceKrw,
        Long depositKrw,
        Long monthlyRentKrw,
        String description,
        double latitude,
        double longitude,
        Instant createdAt,
        String officeName,
        String officePhone,
        int photoCount,
        String previewPhotoUrl,
        String officeAddress,
        String contactTime,
        String moveInDate,
        List<LeadPhotoAsset> photos
    ) {
    }

    public record AdminLeadSummaryResponse(
        long id,
        long officeId,
        String officeName,
        String officePhone,
        Long userId,
        String userName,
        String userEmail,
        String listingTitle,
        String ownerName,
        String phone,
        String email,
        String propertyType,
        String transactionType,
        String addressLine1,
        String addressLine2,
        String region2DepthName,
        String region3DepthName,
        Double latitude,
        Double longitude,
        Double areaM2,
        Long priceKrw,
        Long depositKrw,
        Long monthlyRentKrw,
        String contactTime,
        String description,
        String adminMemo,
        boolean locationVerified,
        boolean privacyConsent,
        boolean marketingConsent,
        String status,
        boolean isPublished,
        Instant publishedAt,
        String utmSource,
        String utmMedium,
        String utmCampaign,
        String referrerUrl,
        String landingUrl,
        Instant createdAt,
        int photoCount,
        List<LeadPhotoAsset> photos
    ) {
    }

    public record MyLeadSummaryResponse(
        long id,
        long officeId,
        String officeName,
        String listingTitle,
        String ownerName,
        String phone,
        String email,
        String propertyType,
        String transactionType,
        String addressLine1,
        String addressLine2,
        String postalCode,
        String regionSlug,
        String region2DepthName,
        String region3DepthName,
        Double areaM2,
        Long priceKrw,
        Long depositKrw,
        Long monthlyRentKrw,
        String moveInDate,
        String contactTime,
        String description,
        String status,
        boolean isPublished,
        Instant createdAt,
        int photoCount,
        List<LeadPhotoAsset> photos
    ) {
    }

    public record AdminLeadUpdateRequest(
        @NotBlank String status,
        @Size(max = 2000) String adminMemo,
        boolean isPublished
    ) {
    }
}
