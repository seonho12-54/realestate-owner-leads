package com.downy.api.location;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class ServiceAreaSupport {

    private static final List<ServiceArea> SERVICE_AREAS = List.of(
        new ServiceArea(
            "울산광역시 중구 다운동",
            "울산광역시",
            "중구",
            "다운동",
            List.of("울산", "울산광역시"),
            List.of("중구"),
            List.of("다운동"),
            35.5571,
            129.3292
        ),
        new ServiceArea(
            "경기도 용인시 처인구 포곡읍",
            "경기도",
            "용인시 처인구",
            "포곡읍",
            List.of("경기", "경기도"),
            List.of("용인시 처인구", "처인구"),
            List.of("포곡읍"),
            37.2799,
            127.2172
        )
    );

    public List<ServiceArea> areas() {
        return SERVICE_AREAS;
    }

    public String serviceRegionLabel() {
        return SERVICE_AREAS.stream().map(ServiceArea::label).reduce((left, right) -> left + " / " + right).orElse("");
    }

    public boolean isAllowed(String region1, String region2, String region3) {
        String normalizedRegion1 = normalize(region1);
        String normalizedRegion2 = normalize(region2);
        String normalizedRegion3 = normalize(region3);

        return SERVICE_AREAS.stream().anyMatch(area ->
            matchesAny(normalizedRegion1, area.region1Aliases())
                && matchesAny(normalizedRegion3, area.region3Aliases())
                && matchesRegion2(normalizedRegion2, area.region2Aliases())
        );
    }

    public List<String> buildSearchQueries(String query) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.isEmpty()) {
            return List.of();
        }

        Set<String> values = new LinkedHashSet<>();
        values.add(trimmed);
        for (ServiceArea area : SERVICE_AREAS) {
            values.add(area.label() + " " + trimmed);
            values.add(area.region3() + " " + trimmed);
        }
        return values.stream().toList();
    }

    private boolean matchesRegion2(String actual, List<String> aliases) {
        if (actual.isEmpty()) {
            return false;
        }

        for (String alias : aliases) {
            String normalizedAlias = normalize(alias);
            if (actual.equals(normalizedAlias) || actual.contains(normalizedAlias) || normalizedAlias.contains(actual)) {
                return true;
            }
        }

        return false;
    }

    private boolean matchesAny(String actual, List<String> aliases) {
        if (actual.isEmpty()) {
            return false;
        }

        return aliases.stream().map(this::normalize).anyMatch(actual::equals);
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value.replace(" ", "").toLowerCase(Locale.ROOT);
    }

    public record ServiceArea(
        String label,
        String region1,
        String region2,
        String region3,
        List<String> region1Aliases,
        List<String> region2Aliases,
        List<String> region3Aliases,
        double lat,
        double lng
    ) {
    }
}
