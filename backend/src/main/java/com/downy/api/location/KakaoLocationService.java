package com.downy.api.location;

import com.downy.api.common.ApiException;
import com.downy.api.config.AppProperties;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class KakaoLocationService {

    private final RestClient restClient;
    private final AppProperties properties;
    private final ServiceAreaSupport serviceAreaSupport;

    public KakaoLocationService(RestClient restClient, AppProperties properties, ServiceAreaSupport serviceAreaSupport) {
        this.restClient = restClient;
        this.properties = properties;
        this.serviceAreaSupport = serviceAreaSupport;
    }

    public VerificationResponse verify(double latitude, double longitude) {
        KakaoRegionResponse payload = restClient.get()
            .uri(UriComponentsBuilder.fromHttpUrl("https://dapi.kakao.com/v2/local/geo/coord2regioncode.json")
                .queryParam("x", longitude)
                .queryParam("y", latitude)
                .build(true)
                .toUri())
            .header(HttpHeaders.AUTHORIZATION, kakaoAuthorization())
            .retrieve()
            .body(KakaoRegionResponse.class);

        if (payload == null || payload.documents() == null || payload.documents().isEmpty()) {
            return new VerificationResponse(false, null, null, null, null, null, null);
        }

        KakaoRegionDocument region = payload.documents().stream()
            .filter(document -> "H".equals(document.regionType()))
            .findFirst()
            .orElse(payload.documents().getFirst());

        ServiceAreaSupport.ServiceArea area = serviceAreaSupport.resolve(
            region.region1DepthName(),
            region.region2DepthName(),
            region.region3DepthName(),
            latitude,
            longitude
        );

        if (area == null) {
            area = serviceAreaSupport.resolveAddressName(region.addressName());
        }

        return new VerificationResponse(
            area != null,
            region.addressName(),
            region.region1DepthName(),
            region.region2DepthName(),
            region.region3DepthName(),
            area != null ? area.slug() : null,
            area != null ? area.name() : null
        );
    }

    public List<AddressSearchResult> searchAddresses(String query) {
        List<String> queries = serviceAreaSupport.buildSearchQueries(query);
        Map<String, AddressSearchResult> deduped = new LinkedHashMap<>();

        for (String searchQuery : queries.stream().limit(5).toList()) {
            KakaoAddressSearchResponse addressPayload = restClient.get()
                .uri(UriComponentsBuilder.fromHttpUrl("https://dapi.kakao.com/v2/local/search/address.json")
                    .queryParam("query", searchQuery)
                    .queryParam("analyze_type", "similar")
                    .queryParam("size", 8)
                    .build(true)
                    .toUri())
                .header(HttpHeaders.AUTHORIZATION, kakaoAuthorization())
                .retrieve()
                .body(KakaoAddressSearchResponse.class);

            if (addressPayload != null && addressPayload.documents() != null) {
                for (KakaoAddressDocument document : addressPayload.documents()) {
                    AddressSearchResult result = toAddressResult(document);
                    if (result == null) {
                        continue;
                    }
                    ServiceAreaSupport.ServiceArea resolved = serviceAreaSupport.resolve(
                        result.region1DepthName(),
                        result.region2DepthName(),
                        result.region3DepthName(),
                        result.latitude(),
                        result.longitude()
                    );
                    if (resolved == null) {
                        continue;
                    }
                    deduped.putIfAbsent(dedupeKey(result), result);
                }
            }

            KakaoKeywordSearchResponse keywordPayload = restClient.get()
                .uri(UriComponentsBuilder.fromHttpUrl("https://dapi.kakao.com/v2/local/search/keyword.json")
                    .queryParam("query", searchQuery)
                    .queryParam("size", 6)
                    .build(true)
                    .toUri())
                .header(HttpHeaders.AUTHORIZATION, kakaoAuthorization())
                .retrieve()
                .body(KakaoKeywordSearchResponse.class);

            if (keywordPayload != null && keywordPayload.documents() != null) {
                for (KakaoKeywordDocument document : keywordPayload.documents()) {
                    if (!StringUtils.hasText(document.x()) || !StringUtils.hasText(document.y())) {
                        continue;
                    }

                    double lat = Double.parseDouble(document.y());
                    double lng = Double.parseDouble(document.x());
                    VerificationResponse verification = verify(lat, lng);
                    if (!verification.allowed()) {
                        continue;
                    }

                    AddressSearchResult result = new AddressSearchResult(
                        StringUtils.hasText(document.addressName()) ? document.addressName() : document.placeName(),
                        StringUtils.hasText(document.roadAddressName()) ? document.roadAddressName() : null,
                        null,
                        lat,
                        lng,
                        verification.region1DepthName(),
                        verification.region2DepthName(),
                        verification.region3DepthName()
                    );
                    deduped.putIfAbsent(dedupeKey(result), result);
                }
            }
        }

        return new ArrayList<>(deduped.values()).stream().limit(12).toList();
    }

    public AddressSearchResult geocodeWithinAllowedArea(String query) {
        return searchAddresses(query).stream()
            .findFirst()
            .orElseThrow(() -> new ApiException(
                HttpStatus.BAD_REQUEST,
                "REGION_UNSUPPORTED",
                serviceAreaSupport.serviceRegionLabel() + " 안의 주소만 등록할 수 있어요."
            ));
    }

    private AddressSearchResult toAddressResult(KakaoAddressDocument document) {
        if (!StringUtils.hasText(document.y()) || !StringUtils.hasText(document.x())) {
            return null;
        }

        String region1DepthName;
        String region2DepthName;
        String region3DepthName;
        String roadAddress = null;
        String postalCode = null;

        if (document.roadAddress() != null) {
            KakaoRoadAddress road = document.roadAddress();
            region1DepthName = road.region1DepthName();
            region2DepthName = road.region2DepthName();
            region3DepthName = road.region3DepthName();
            roadAddress = road.addressName();
            postalCode = road.zoneNo();
        } else if (document.address() != null) {
            KakaoRegionAddress address = document.address();
            region1DepthName = address.region1DepthName();
            region2DepthName = address.region2DepthName();
            region3DepthName = address.region3DepthName();
        } else {
            return null;
        }

        return new AddressSearchResult(
            document.addressName(),
            roadAddress,
            postalCode,
            Double.parseDouble(document.y()),
            Double.parseDouble(document.x()),
            region1DepthName,
            region2DepthName,
            region3DepthName
        );
    }

    private String dedupeKey(AddressSearchResult result) {
        return (result.roadAddress() != null ? result.roadAddress() : result.addressName()) + "|" + result.latitude() + "|" + result.longitude();
    }

    private String kakaoAuthorization() {
        if (!StringUtils.hasText(properties.getKakaoRestApiKey())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "카카오 REST API 키가 설정되지 않았어요.");
        }
        return "KakaoAK " + properties.getKakaoRestApiKey();
    }

    public record AddressSearchResult(
        String addressName,
        String roadAddress,
        String postalCode,
        double latitude,
        double longitude,
        String region1DepthName,
        String region2DepthName,
        String region3DepthName
    ) {
    }

    public record VerificationResponse(
        boolean allowed,
        String addressName,
        String region1DepthName,
        String region2DepthName,
        String region3DepthName,
        String regionSlug,
        String regionName
    ) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record KakaoAddressSearchResponse(List<KakaoAddressDocument> documents) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record KakaoKeywordSearchResponse(List<KakaoKeywordDocument> documents) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record KakaoRegionResponse(List<KakaoRegionDocument> documents) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record KakaoAddressDocument(
        String addressName,
        String x,
        String y,
        KakaoRegionAddress address,
        KakaoRoadAddress roadAddress
    ) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record KakaoKeywordDocument(
        String addressName,
        String roadAddressName,
        String placeName,
        String x,
        String y
    ) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record KakaoRegionDocument(
        String regionType,
        String addressName,
        String region1DepthName,
        String region2DepthName,
        String region3DepthName
    ) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record KakaoRegionAddress(
        String addressName,
        String region1DepthName,
        String region2DepthName,
        String region3DepthName,
        String x,
        String y
    ) {
    }

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
    public record KakaoRoadAddress(
        String addressName,
        String region1DepthName,
        String region2DepthName,
        String region3DepthName,
        String zoneNo,
        String x,
        String y
    ) {
    }
}
