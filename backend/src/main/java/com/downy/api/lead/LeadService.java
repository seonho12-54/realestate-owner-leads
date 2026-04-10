package com.downy.api.lead;

import com.downy.api.auth.SessionModels.SessionSnapshot;
import com.downy.api.common.ApiException;
import com.downy.api.common.AuditLogService;
import com.downy.api.common.RequestMeta;
import com.downy.api.lead.LeadDtos.AdminLeadSummaryResponse;
import com.downy.api.lead.LeadDtos.AdminLeadUpdateRequest;
import com.downy.api.lead.LeadDtos.CreateLeadRequest;
import com.downy.api.lead.LeadDtos.LeadDetailResponse;
import com.downy.api.lead.LeadDtos.LeadPhotoAsset;
import com.downy.api.lead.LeadDtos.LeadPhotoInput;
import com.downy.api.lead.LeadDtos.MyLeadSummaryResponse;
import com.downy.api.lead.LeadDtos.PublicListingResponse;
import com.downy.api.lead.LeadDtos.UserLeadUpdateRequest;
import com.downy.api.location.KakaoLocationService;
import com.downy.api.location.KakaoLocationService.AddressSearchResult;
import com.downy.api.location.RegionAccessService;
import com.downy.api.location.ServiceAreaSupport;
import com.downy.api.s3.S3Service;
import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LeadService {

    private final JdbcTemplate jdbcTemplate;
    private final NamedParameterJdbcTemplate namedParameterJdbcTemplate;
    private final KakaoLocationService kakaoLocationService;
    private final ServiceAreaSupport serviceAreaSupport;
    private final S3Service s3Service;
    private final AuditLogService auditLogService;

    public LeadService(
        JdbcTemplate jdbcTemplate,
        NamedParameterJdbcTemplate namedParameterJdbcTemplate,
        KakaoLocationService kakaoLocationService,
        ServiceAreaSupport serviceAreaSupport,
        S3Service s3Service,
        AuditLogService auditLogService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.namedParameterJdbcTemplate = namedParameterJdbcTemplate;
        this.kakaoLocationService = kakaoLocationService;
        this.serviceAreaSupport = serviceAreaSupport;
        this.s3Service = s3Service;
        this.auditLogService = auditLogService;
    }

    @Transactional
    public long createLead(CreateLeadRequest input, RequestMeta requestMeta, SessionSnapshot sessionSnapshot, String verifiedRegionSlug) {
        AddressSearchResult geocoded = kakaoLocationService.geocodeWithinAllowedArea(input.addressLine1());
        ServiceAreaSupport.ServiceArea serviceArea = resolveServiceArea(geocoded);
        ensureOfficeExists(input.officeId());

        if (verifiedRegionSlug != null && !verifiedRegionSlug.equals(serviceArea.slug())) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                RegionAccessService.REGION_ACCESS_DENIED,
                "인증한 지역 안의 매물만 등록할 수 있어요."
            );
        }

        GeneratedKeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                """
                    INSERT INTO leads (
                        office_id,
                        user_id,
                        listing_title,
                        owner_name,
                        phone,
                        email,
                        property_type,
                        transaction_type,
                        address_line1,
                        address_line2,
                        postal_code,
                        region_1depth_name,
                        region_2depth_name,
                        region_3depth_name,
                        region_slug,
                        latitude,
                        longitude,
                        location_verified,
                        area_m2,
                        price_krw,
                        deposit_krw,
                        monthly_rent_krw,
                        move_in_date,
                        contact_time,
                        description,
                        privacy_consent,
                        marketing_consent,
                        utm_source,
                        utm_medium,
                        utm_campaign,
                        utm_term,
                        utm_content,
                        referrer_url,
                        landing_url,
                        user_agent,
                        submitted_ip
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                Statement.RETURN_GENERATED_KEYS
            );

            int index = 1;
            ps.setLong(index++, input.officeId());
            if (sessionSnapshot.user() != null) {
                ps.setLong(index++, sessionSnapshot.user().userId());
            } else {
                ps.setObject(index++, null);
            }
            ps.setString(index++, input.listingTitle());
            ps.setString(index++, input.ownerName());
            ps.setString(index++, input.phone());
            ps.setString(index++, blankToNull(input.email()));
            ps.setString(index++, input.propertyType());
            ps.setString(index++, input.transactionType());
            ps.setString(index++, geocoded.roadAddress() != null ? geocoded.roadAddress() : geocoded.addressName());
            ps.setString(index++, blankToNull(input.addressLine2()));
            ps.setString(index++, blankToNull(input.postalCode()) != null ? input.postalCode() : geocoded.postalCode());
            ps.setString(index++, geocoded.region1DepthName());
            ps.setString(index++, geocoded.region2DepthName());
            ps.setString(index++, geocoded.region3DepthName());
            ps.setString(index++, serviceArea.slug());
            ps.setBigDecimal(index++, BigDecimal.valueOf(geocoded.latitude()));
            ps.setBigDecimal(index++, BigDecimal.valueOf(geocoded.longitude()));
            ps.setBoolean(index++, true);
            setNullableBigDecimal(ps, index++, input.areaM2());
            setNullableLong(ps, index++, input.priceKrw());
            setNullableLong(ps, index++, input.depositKrw());
            setNullableLong(ps, index++, input.monthlyRentKrw());
            ps.setString(index++, blankToNull(input.moveInDate()));
            ps.setString(index++, blankToNull(input.contactTime()));
            ps.setString(index++, blankToNull(input.description()));
            ps.setBoolean(index++, input.privacyConsent());
            ps.setBoolean(index++, input.marketingConsent());
            ps.setString(index++, blankToNull(input.utmSource()));
            ps.setString(index++, blankToNull(input.utmMedium()));
            ps.setString(index++, blankToNull(input.utmCampaign()));
            ps.setString(index++, blankToNull(input.utmTerm()));
            ps.setString(index++, blankToNull(input.utmContent()));
            ps.setString(index++, blankToNull(input.referrerUrl()));
            ps.setString(index++, blankToNull(input.landingUrl()));
            ps.setString(index++, blankToNull(requestMeta.userAgent()));
            ps.setString(index, blankToNull(requestMeta.ip()));
            return ps;
        }, keyHolder);

        Number key = keyHolder.getKey();
        if (key == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "매물 등록 ID를 만들지 못했습니다.");
        }

        long leadId = key.longValue();
        replaceLeadPhotos(leadId, input.photos());

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("officeId", input.officeId());
        payload.put("userId", sessionSnapshot.user() != null ? sessionSnapshot.user().userId() : null);
        payload.put("listingTitle", input.listingTitle());
        payload.put("transactionType", input.transactionType());
        payload.put("region2DepthName", geocoded.region2DepthName());
        payload.put("region3DepthName", geocoded.region3DepthName());
        payload.put("regionSlug", serviceArea.slug());
        auditLogService.write(
            sessionSnapshot.admin() != null ? sessionSnapshot.admin().adminId() : null,
            "lead.created",
            "lead",
            leadId,
            requestMeta,
            payload
        );

        return leadId;
    }

    public List<PublicListingResponse> listPreviewListings(int limit) {
        int safeLimit = Math.max(3, Math.min(limit, 6));

        List<PublicListingRow> rows = jdbcTemplate.query(
            """
                SELECT
                    l.id,
                    l.listing_title,
                    l.property_type,
                    l.transaction_type,
                    l.region_slug,
                    l.address_line1,
                    l.address_line2,
                    l.region_3depth_name,
                    l.area_m2,
                    l.price_krw,
                    l.deposit_krw,
                    l.monthly_rent_krw,
                    l.description,
                    l.latitude,
                    l.longitude,
                    l.created_at,
                    o.name AS office_name,
                    o.phone AS office_phone,
                    COUNT(lp.id) AS photo_count
                FROM leads l
                INNER JOIN offices o ON o.id = l.office_id
                LEFT JOIN lead_photos lp ON lp.lead_id = l.id
                WHERE l.is_published = 1
                  AND l.location_verified = 1
                  AND l.latitude IS NOT NULL
                  AND l.longitude IS NOT NULL
                GROUP BY l.id
                ORDER BY COALESCE(l.published_at, l.created_at) DESC, l.created_at DESC
                LIMIT ?
                """,
            (rs, rowNum) -> new PublicListingRow(
                rs.getLong("id"),
                rs.getString("listing_title"),
                rs.getString("property_type"),
                rs.getString("transaction_type"),
                rs.getString("region_slug"),
                rs.getString("address_line1"),
                rs.getString("address_line2"),
                rs.getString("region_3depth_name"),
                getNullableDouble(rs.getBigDecimal("area_m2")),
                getNullableLong(rs.getObject("price_krw")),
                getNullableLong(rs.getObject("deposit_krw")),
                getNullableLong(rs.getObject("monthly_rent_krw")),
                rs.getString("description"),
                Objects.requireNonNull(rs.getBigDecimal("latitude")).doubleValue(),
                Objects.requireNonNull(rs.getBigDecimal("longitude")).doubleValue(),
                rs.getTimestamp("created_at").toInstant(),
                rs.getString("office_name"),
                rs.getString("office_phone"),
                rs.getInt("photo_count")
            ),
            safeLimit
        );

        return toPublicListingResponses(rows, true);
    }

    public List<PublicListingResponse> listPublishedListings(String regionSlug) {
        List<PublicListingRow> rows = jdbcTemplate.query(
            """
                SELECT
                    l.id,
                    l.listing_title,
                    l.property_type,
                    l.transaction_type,
                    l.region_slug,
                    l.address_line1,
                    l.address_line2,
                    l.region_3depth_name,
                    l.area_m2,
                    l.price_krw,
                    l.deposit_krw,
                    l.monthly_rent_krw,
                    l.description,
                    l.latitude,
                    l.longitude,
                    l.created_at,
                    o.name AS office_name,
                    o.phone AS office_phone,
                    COUNT(lp.id) AS photo_count
                FROM leads l
                INNER JOIN offices o ON o.id = l.office_id
                LEFT JOIN lead_photos lp ON lp.lead_id = l.id
                WHERE l.is_published = 1
                  AND l.location_verified = 1
                  AND l.latitude IS NOT NULL
                  AND l.longitude IS NOT NULL
                  AND l.region_slug = ?
                GROUP BY l.id
                ORDER BY l.is_published DESC, l.created_at DESC
                """,
            (rs, rowNum) -> new PublicListingRow(
                rs.getLong("id"),
                rs.getString("listing_title"),
                rs.getString("property_type"),
                rs.getString("transaction_type"),
                rs.getString("region_slug"),
                rs.getString("address_line1"),
                rs.getString("address_line2"),
                rs.getString("region_3depth_name"),
                getNullableDouble(rs.getBigDecimal("area_m2")),
                getNullableLong(rs.getObject("price_krw")),
                getNullableLong(rs.getObject("deposit_krw")),
                getNullableLong(rs.getObject("monthly_rent_krw")),
                rs.getString("description"),
                Objects.requireNonNull(rs.getBigDecimal("latitude")).doubleValue(),
                Objects.requireNonNull(rs.getBigDecimal("longitude")).doubleValue(),
                rs.getTimestamp("created_at").toInstant(),
                rs.getString("office_name"),
                rs.getString("office_phone"),
                rs.getInt("photo_count")
            ),
            regionSlug
        );

        return toPublicListingResponses(rows, false);
    }

    public LeadDetailResponse getPublishedListingDetail(long leadId, String accessibleRegionSlug) {
        String actualRegionSlug = jdbcTemplate.query(
            """
                SELECT region_slug
                FROM leads
                WHERE id = ?
                  AND is_published = 1
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getString("region_slug"),
            leadId
        ).stream().findFirst().orElse(null);

        if (actualRegionSlug == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "매물을 찾을 수 없어요.");
        }

        if (accessibleRegionSlug != null && !Objects.equals(actualRegionSlug, accessibleRegionSlug)) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                RegionAccessService.REGION_ACCESS_DENIED,
                "인증한 지역 밖의 매물은 볼 수 없어요."
            );
        }

        List<LeadDetailRow> rows;
        if (accessibleRegionSlug == null) {
            rows = jdbcTemplate.query(
                """
                    SELECT
                        l.id,
                        l.listing_title,
                        l.property_type,
                        l.transaction_type,
                        l.region_slug,
                        l.address_line1,
                        l.address_line2,
                        l.region_3depth_name,
                        l.area_m2,
                        l.price_krw,
                        l.deposit_krw,
                        l.monthly_rent_krw,
                        l.description,
                        l.contact_time,
                        l.move_in_date,
                        l.latitude,
                        l.longitude,
                        l.created_at,
                        o.name AS office_name,
                        o.phone AS office_phone,
                        o.address AS office_address
                    FROM leads l
                    INNER JOIN offices o ON o.id = l.office_id
                    WHERE l.id = ?
                      AND l.is_published = 1
                    LIMIT 1
                    """,
                (rs, rowNum) -> new LeadDetailRow(
                    rs.getLong("id"),
                    rs.getString("listing_title"),
                    rs.getString("property_type"),
                    rs.getString("transaction_type"),
                    rs.getString("region_slug"),
                    rs.getString("address_line1"),
                    rs.getString("address_line2"),
                    rs.getString("region_3depth_name"),
                    getNullableDouble(rs.getBigDecimal("area_m2")),
                    getNullableLong(rs.getObject("price_krw")),
                    getNullableLong(rs.getObject("deposit_krw")),
                    getNullableLong(rs.getObject("monthly_rent_krw")),
                    rs.getString("description"),
                    rs.getString("contact_time"),
                    rs.getString("move_in_date"),
                    Objects.requireNonNull(rs.getBigDecimal("latitude")).doubleValue(),
                    Objects.requireNonNull(rs.getBigDecimal("longitude")).doubleValue(),
                    rs.getTimestamp("created_at").toInstant(),
                    rs.getString("office_name"),
                    rs.getString("office_phone"),
                    rs.getString("office_address")
                ),
                leadId
            );
        } else {
            rows = jdbcTemplate.query(
                """
                    SELECT
                        l.id,
                        l.listing_title,
                        l.property_type,
                        l.transaction_type,
                        l.region_slug,
                        l.address_line1,
                        l.address_line2,
                        l.region_3depth_name,
                        l.area_m2,
                        l.price_krw,
                        l.deposit_krw,
                        l.monthly_rent_krw,
                        l.description,
                        l.contact_time,
                        l.move_in_date,
                        l.latitude,
                        l.longitude,
                        l.created_at,
                        o.name AS office_name,
                        o.phone AS office_phone,
                        o.address AS office_address
                    FROM leads l
                    INNER JOIN offices o ON o.id = l.office_id
                    WHERE l.id = ?
                      AND l.is_published = 1
                      AND l.region_slug = ?
                    LIMIT 1
                    """,
                (rs, rowNum) -> new LeadDetailRow(
                    rs.getLong("id"),
                    rs.getString("listing_title"),
                    rs.getString("property_type"),
                    rs.getString("transaction_type"),
                    rs.getString("region_slug"),
                    rs.getString("address_line1"),
                    rs.getString("address_line2"),
                    rs.getString("region_3depth_name"),
                    getNullableDouble(rs.getBigDecimal("area_m2")),
                    getNullableLong(rs.getObject("price_krw")),
                    getNullableLong(rs.getObject("deposit_krw")),
                    getNullableLong(rs.getObject("monthly_rent_krw")),
                    rs.getString("description"),
                    rs.getString("contact_time"),
                    rs.getString("move_in_date"),
                    Objects.requireNonNull(rs.getBigDecimal("latitude")).doubleValue(),
                    Objects.requireNonNull(rs.getBigDecimal("longitude")).doubleValue(),
                    rs.getTimestamp("created_at").toInstant(),
                    rs.getString("office_name"),
                    rs.getString("office_phone"),
                    rs.getString("office_address")
                ),
                leadId,
                accessibleRegionSlug
            );
        }

        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "매물을 찾을 수 없어요.");
        }

        LeadDetailRow row = rows.getFirst();
        List<LeadPhotoAsset> photos = new ArrayList<>(listLeadPhotoAssets(List.of(leadId), 999).getOrDefault(leadId, List.of()));
        return new LeadDetailResponse(
            row.id(),
            row.listingTitle(),
            row.propertyType(),
            row.transactionType(),
            row.regionSlug(),
            row.addressLine1(),
            row.addressLine2(),
            row.region3DepthName(),
            row.areaM2(),
            row.priceKrw(),
            row.depositKrw(),
            row.monthlyRentKrw(),
            row.description(),
            row.latitude(),
            row.longitude(),
            row.createdAt(),
            row.officeName(),
            row.officePhone(),
            photos.size(),
            photos.isEmpty() ? null : photos.getFirst().viewUrl(),
            row.officeAddress(),
            row.contactTime(),
            row.moveInDate(),
            photos
        );
    }

    public void incrementViewCount(long leadId, String accessibleRegionSlug) {
        if (accessibleRegionSlug == null) {
            jdbcTemplate.update(
                """
                    UPDATE leads
                    SET view_count = view_count + 1
                    WHERE id = ?
                      AND is_published = 1
                    """,
                leadId
            );
            return;
        }

        jdbcTemplate.update(
            """
                UPDATE leads
                SET view_count = view_count + 1
                WHERE id = ?
                  AND is_published = 1
                  AND region_slug = ?
                """,
            leadId,
            accessibleRegionSlug
        );
    }

    public List<MyLeadSummaryResponse> listUserLeads(long userId) {
        List<UserLeadRow> rows = jdbcTemplate.query(
            """
                SELECT
                    l.id,
                    l.office_id,
                    o.name AS office_name,
                    l.listing_title,
                    l.owner_name,
                    l.phone,
                    l.email,
                    l.property_type,
                    l.transaction_type,
                    l.address_line1,
                    l.address_line2,
                    l.postal_code,
                    l.region_slug,
                    l.region_2depth_name,
                    l.region_3depth_name,
                    l.area_m2,
                    l.price_krw,
                    l.deposit_krw,
                    l.monthly_rent_krw,
                    l.move_in_date,
                    l.contact_time,
                    l.description,
                    l.status,
                    l.is_published,
                    l.created_at,
                    COUNT(lp.id) AS photo_count
                FROM leads l
                INNER JOIN offices o ON o.id = l.office_id
                LEFT JOIN lead_photos lp ON lp.lead_id = l.id
                WHERE l.user_id = ?
                GROUP BY l.id
                ORDER BY l.created_at DESC
                """,
            (rs, rowNum) -> new UserLeadRow(
                rs.getLong("id"),
                rs.getLong("office_id"),
                rs.getString("office_name"),
                rs.getString("listing_title"),
                rs.getString("owner_name"),
                rs.getString("phone"),
                rs.getString("email"),
                rs.getString("property_type"),
                rs.getString("transaction_type"),
                rs.getString("address_line1"),
                rs.getString("address_line2"),
                rs.getString("postal_code"),
                rs.getString("region_slug"),
                rs.getString("region_2depth_name"),
                rs.getString("region_3depth_name"),
                getNullableDouble(rs.getBigDecimal("area_m2")),
                getNullableLong(rs.getObject("price_krw")),
                getNullableLong(rs.getObject("deposit_krw")),
                getNullableLong(rs.getObject("monthly_rent_krw")),
                rs.getString("move_in_date"),
                rs.getString("contact_time"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getBoolean("is_published"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getInt("photo_count")
            ),
            userId
        );

        Map<Long, List<LeadPhotoAsset>> photoMap = listLeadPhotoAssets(rows.stream().map(UserLeadRow::id).toList(), 8);
        return rows.stream().map(row -> new MyLeadSummaryResponse(
            row.id(),
            row.officeId(),
            row.officeName(),
            row.listingTitle(),
            row.ownerName(),
            row.phone(),
            row.email(),
            row.propertyType(),
            row.transactionType(),
            row.addressLine1(),
            row.addressLine2(),
            row.postalCode(),
            row.regionSlug(),
            row.region2DepthName(),
            row.region3DepthName(),
            row.areaM2(),
            row.priceKrw(),
            row.depositKrw(),
            row.monthlyRentKrw(),
            row.moveInDate(),
            row.contactTime(),
            row.description(),
            row.status(),
            row.isPublished(),
            row.createdAt(),
            row.photoCount(),
            photoMap.getOrDefault(row.id(), List.of())
        )).toList();
    }
    @Transactional
    public void updateUserLead(long leadId, long userId, UserLeadUpdateRequest request, RequestMeta requestMeta, String verifiedRegionSlug) {
        ensureOfficeExists(request.officeId());
        AddressSearchResult geocoded = kakaoLocationService.geocodeWithinAllowedArea(request.addressLine1());
        ServiceAreaSupport.ServiceArea serviceArea = resolveServiceArea(geocoded);

        if (!verifiedRegionSlug.equals(serviceArea.slug())) {
            throw new ApiException(
                HttpStatus.FORBIDDEN,
                RegionAccessService.REGION_ACCESS_DENIED,
                "인증한 지역 안의 매물만 수정할 수 있어요."
            );
        }

        int updated = jdbcTemplate.update(
            """
                UPDATE leads
                SET
                    office_id = ?,
                    listing_title = ?,
                    owner_name = ?,
                    phone = ?,
                    email = ?,
                    property_type = ?,
                    transaction_type = ?,
                    address_line1 = ?,
                    address_line2 = ?,
                    postal_code = ?,
                    region_1depth_name = ?,
                    region_2depth_name = ?,
                    region_3depth_name = ?,
                    region_slug = ?,
                    latitude = ?,
                    longitude = ?,
                    location_verified = 1,
                    area_m2 = ?,
                    price_krw = ?,
                    deposit_krw = ?,
                    monthly_rent_krw = ?,
                    move_in_date = ?,
                    contact_time = ?,
                    description = ?,
                    status = 'reviewing',
                    is_published = 0,
                    published_at = NULL,
                    published_by_admin_id = NULL,
                    admin_memo = NULL
                WHERE id = ? AND user_id = ?
                """,
            request.officeId(),
            request.listingTitle(),
            request.ownerName(),
            request.phone(),
            blankToNull(request.email()),
            request.propertyType(),
            request.transactionType(),
            geocoded.roadAddress() != null ? geocoded.roadAddress() : geocoded.addressName(),
            blankToNull(request.addressLine2()),
            blankToNull(request.postalCode()) != null ? request.postalCode() : geocoded.postalCode(),
            geocoded.region1DepthName(),
            geocoded.region2DepthName(),
            geocoded.region3DepthName(),
            serviceArea.slug(),
            BigDecimal.valueOf(geocoded.latitude()),
            BigDecimal.valueOf(geocoded.longitude()),
            request.areaM2() == null ? null : BigDecimal.valueOf(request.areaM2()),
            request.priceKrw(),
            request.depositKrw(),
            request.monthlyRentKrw(),
            blankToNull(request.moveInDate()),
            blankToNull(request.contactTime()),
            blankToNull(request.description()),
            leadId,
            userId
        );

        if (updated == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "수정할 매물을 찾을 수 없어요.");
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("userId", userId);
        payload.put("listingTitle", request.listingTitle());
        payload.put("transactionType", request.transactionType());
        payload.put("region2DepthName", geocoded.region2DepthName());
        payload.put("region3DepthName", geocoded.region3DepthName());
        payload.put("regionSlug", serviceArea.slug());
        auditLogService.write(null, "lead.user_updated", "lead", leadId, requestMeta, payload);
    }

    public List<AdminLeadSummaryResponse> listAdminLeads(String status) {
        String whereClause = status != null && !status.isBlank() ? "WHERE l.status = ?" : "";
        Object[] params = status != null && !status.isBlank() ? new Object[]{status} : new Object[]{};

        List<AdminLeadRow> rows = jdbcTemplate.query(
            """
                SELECT
                    l.id,
                    l.office_id,
                    o.name AS office_name,
                    o.phone AS office_phone,
                    l.user_id,
                    u.name AS user_name,
                    u.email AS user_email,
                    l.listing_title,
                    l.owner_name,
                    l.phone,
                    l.email,
                    l.property_type,
                    l.transaction_type,
                    l.address_line1,
                    l.address_line2,
                    l.region_2depth_name,
                    l.region_3depth_name,
                    l.latitude,
                    l.longitude,
                    l.area_m2,
                    l.price_krw,
                    l.deposit_krw,
                    l.monthly_rent_krw,
                    l.contact_time,
                    l.description,
                    l.admin_memo,
                    l.location_verified,
                    l.privacy_consent,
                    l.marketing_consent,
                    l.status,
                    l.is_published,
                    l.published_at,
                    l.utm_source,
                    l.utm_medium,
                    l.utm_campaign,
                    l.referrer_url,
                    l.landing_url,
                    l.created_at,
                    COUNT(lp.id) AS photo_count
                FROM leads l
                INNER JOIN offices o ON o.id = l.office_id
                LEFT JOIN users u ON u.id = l.user_id
                LEFT JOIN lead_photos lp ON lp.lead_id = l.id
                """
                + whereClause + """
                GROUP BY l.id
                ORDER BY l.created_at DESC
                """,
            (rs, rowNum) -> new AdminLeadRow(
                rs.getLong("id"),
                rs.getLong("office_id"),
                rs.getString("office_name"),
                rs.getString("office_phone"),
                getNullableLong(rs.getObject("user_id")),
                rs.getString("user_name"),
                rs.getString("user_email"),
                rs.getString("listing_title"),
                rs.getString("owner_name"),
                rs.getString("phone"),
                rs.getString("email"),
                rs.getString("property_type"),
                rs.getString("transaction_type"),
                rs.getString("address_line1"),
                rs.getString("address_line2"),
                rs.getString("region_2depth_name"),
                rs.getString("region_3depth_name"),
                getNullableDouble(rs.getBigDecimal("latitude")),
                getNullableDouble(rs.getBigDecimal("longitude")),
                getNullableDouble(rs.getBigDecimal("area_m2")),
                getNullableLong(rs.getObject("price_krw")),
                getNullableLong(rs.getObject("deposit_krw")),
                getNullableLong(rs.getObject("monthly_rent_krw")),
                rs.getString("contact_time"),
                rs.getString("description"),
                rs.getString("admin_memo"),
                rs.getBoolean("location_verified"),
                rs.getBoolean("privacy_consent"),
                rs.getBoolean("marketing_consent"),
                rs.getString("status"),
                rs.getBoolean("is_published"),
                rs.getTimestamp("published_at") == null ? null : rs.getTimestamp("published_at").toInstant(),
                rs.getString("utm_source"),
                rs.getString("utm_medium"),
                rs.getString("utm_campaign"),
                rs.getString("referrer_url"),
                rs.getString("landing_url"),
                rs.getTimestamp("created_at").toInstant(),
                rs.getInt("photo_count")
            ),
            params
        );

        Map<Long, List<LeadPhotoAsset>> photoMap = listLeadPhotoAssets(rows.stream().map(AdminLeadRow::id).toList(), 6);
        return rows.stream().map(row -> new AdminLeadSummaryResponse(
            row.id(),
            row.officeId(),
            row.officeName(),
            row.officePhone(),
            row.userId(),
            row.userName(),
            row.userEmail(),
            row.listingTitle(),
            row.ownerName(),
            row.phone(),
            row.email(),
            row.propertyType(),
            row.transactionType(),
            row.addressLine1(),
            row.addressLine2(),
            row.region2DepthName(),
            row.region3DepthName(),
            row.latitude(),
            row.longitude(),
            row.areaM2(),
            row.priceKrw(),
            row.depositKrw(),
            row.monthlyRentKrw(),
            row.contactTime(),
            row.description(),
            row.adminMemo(),
            row.locationVerified(),
            row.privacyConsent(),
            row.marketingConsent(),
            row.status(),
            row.isPublished(),
            row.publishedAt(),
            row.utmSource(),
            row.utmMedium(),
            row.utmCampaign(),
            row.referrerUrl(),
            row.landingUrl(),
            row.createdAt(),
            row.photoCount(),
            photoMap.getOrDefault(row.id(), List.of())
        )).toList();
    }

    @Transactional
    public void updateLeadAdminFields(long leadId, AdminLeadUpdateRequest request, long adminId, RequestMeta requestMeta) {
        int updated = jdbcTemplate.update(
            """
                UPDATE leads
                SET
                    status = ?,
                    is_published = ?,
                    admin_memo = ?,
                    published_at = CASE
                        WHEN ? = 1 AND published_at IS NULL THEN NOW()
                        WHEN ? = 0 THEN NULL
                        ELSE published_at
                    END,
                    published_by_admin_id = CASE
                        WHEN ? = 1 THEN ?
                        ELSE published_by_admin_id
                    END
                WHERE id = ?
                """,
            request.status(),
            request.isPublished(),
            blankToNull(request.adminMemo()),
            request.isPublished(),
            request.isPublished(),
            request.isPublished(),
            adminId,
            leadId
        );

        if (updated == 0) {
            throw new ApiException(HttpStatus.NOT_FOUND, "매물을 찾을 수 없어요.");
        }

        auditLogService.write(
            adminId,
            "lead.admin_updated",
            "lead",
            leadId,
            requestMeta,
            Map.of("status", request.status(), "isPublished", request.isPublished())
        );
    }

    private void ensureOfficeExists(long officeId) {
        Integer exists = jdbcTemplate.queryForObject(
            """
                SELECT COUNT(*)
                FROM offices
                WHERE id = ? AND is_active = 1
                """,
            Integer.class,
            officeId
        );

        if (exists == null || exists == 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "선택한 중개사무소를 찾을 수 없어요.");
        }
    }

    private ServiceAreaSupport.ServiceArea resolveServiceArea(AddressSearchResult geocoded) {
        ServiceAreaSupport.ServiceArea serviceArea = serviceAreaSupport.resolve(
            geocoded.region1DepthName(),
            geocoded.region2DepthName(),
            geocoded.region3DepthName()
        );
        if (serviceArea == null) {
            throw new ApiException(
                HttpStatus.BAD_REQUEST,
                RegionAccessService.REGION_UNSUPPORTED,
                "지원하지 않는 지역의 주소예요. 인증한 동네 안에서 다시 확인해주세요."
            );
        }
        return serviceArea;
    }

    private void replaceLeadPhotos(long leadId, List<LeadPhotoInput> photos) {
        if (photos == null || photos.isEmpty()) {
            return;
        }

        jdbcTemplate.batchUpdate(
            """
                INSERT INTO lead_photos (
                    lead_id,
                    s3_key,
                    file_name,
                    content_type,
                    file_size,
                    display_order
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
            photos,
            photos.size(),
            (ps, photo) -> {
                ps.setLong(1, leadId);
                ps.setString(2, photo.s3Key());
                ps.setString(3, photo.fileName());
                ps.setString(4, photo.contentType());
                ps.setLong(5, photo.fileSize());
                ps.setInt(6, photo.displayOrder());
            }
        );
    }

    private Map<Long, List<LeadPhotoAsset>> listLeadPhotoAssets(List<Long> leadIds, int perLeadLimit) {
        if (leadIds.isEmpty()) {
            return Map.of();
        }

        List<LeadPhotoRow> rows = namedParameterJdbcTemplate.query(
            """
                SELECT id, lead_id, s3_key, file_name
                FROM lead_photos
                WHERE lead_id IN (:leadIds)
                ORDER BY display_order ASC, id ASC
                """,
            new MapSqlParameterSource("leadIds", leadIds),
            (rs, rowNum) -> new LeadPhotoRow(
                rs.getLong("id"),
                rs.getLong("lead_id"),
                rs.getString("s3_key"),
                rs.getString("file_name")
            )
        );

        Map<Long, List<LeadPhotoRow>> groupedRows = rows.stream().collect(Collectors.groupingBy(LeadPhotoRow::leadId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, List<LeadPhotoAsset>> result = new HashMap<>();

        for (Map.Entry<Long, List<LeadPhotoRow>> entry : groupedRows.entrySet()) {
            List<LeadPhotoAsset> assets = new ArrayList<>();
            for (LeadPhotoRow photoRow : entry.getValue()) {
                if (assets.size() >= perLeadLimit) {
                    break;
                }
                String viewUrl = null;
                try {
                    viewUrl = s3Service.createPresignedViewUrl(photoRow.s3Key());
                } catch (Exception exception) {
                    System.err.println("Failed to create view url for " + photoRow.s3Key() + ": " + exception.getMessage());
                }
                assets.add(new LeadPhotoAsset(photoRow.id(), photoRow.leadId(), photoRow.fileName(), photoRow.s3Key(), viewUrl));
            }
            result.put(entry.getKey(), assets);
        }

        return result;
    }

    private List<PublicListingResponse> toPublicListingResponses(List<PublicListingRow> rows, boolean preview) {
        Map<Long, List<LeadPhotoAsset>> photoMap = listLeadPhotoAssets(rows.stream().map(PublicListingRow::id).toList(), 1);

        return rows.stream().map(row -> new PublicListingResponse(
            row.id(),
            row.listingTitle(),
            row.propertyType(),
            row.transactionType(),
            preview,
            row.regionSlug(),
            row.addressLine1(),
            row.addressLine2(),
            row.region3DepthName(),
            row.areaM2(),
            row.priceKrw(),
            row.depositKrw(),
            row.monthlyRentKrw(),
            row.description(),
            row.latitude(),
            row.longitude(),
            row.createdAt(),
            row.officeName(),
            row.officePhone(),
            row.photoCount(),
            photoMap.getOrDefault(row.id(), List.of()).stream().findFirst().map(LeadPhotoAsset::viewUrl).orElse(null)
        )).toList();
    }

    private void setNullableBigDecimal(PreparedStatement ps, int index, Double value) throws java.sql.SQLException {
        if (value == null) {
            ps.setObject(index, null);
            return;
        }
        ps.setBigDecimal(index, BigDecimal.valueOf(value));
    }

    private void setNullableLong(PreparedStatement ps, int index, Long value) throws java.sql.SQLException {
        if (value == null) {
            ps.setObject(index, null);
            return;
        }
        ps.setLong(index, value);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private Long getNullableLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.valueOf(String.valueOf(value));
    }

    private Double getNullableDouble(BigDecimal value) {
        return value == null ? null : value.doubleValue();
    }

    private record PublicListingRow(
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
        int photoCount
    ) {
    }

    private record LeadDetailRow(
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
        String contactTime,
        String moveInDate,
        double latitude,
        double longitude,
        Instant createdAt,
        String officeName,
        String officePhone,
        String officeAddress
    ) {
    }

    private record UserLeadRow(
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
        int photoCount
    ) {
    }

    private record AdminLeadRow(
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
        int photoCount
    ) {
    }

    private record LeadPhotoRow(long id, long leadId, String s3Key, String fileName) {
    }
}
