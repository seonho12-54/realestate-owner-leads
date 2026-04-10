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
            "ulsan-junggu-daun",
            "울산광역시 중구 다운동",
            "울산광역시",
            "중구",
            "다운동",
            List.of("울산", "울산광역시"),
            List.of("중구"),
            List.of("다운동"),
            false,
            35.5571,
            129.3292
        ),
        new ServiceArea(
            "yongin-cheoin-yeokbuk",
            "경기도 용인시 처인구 역북동",
            "경기도",
            "용인시 처인구",
            "역북동",
            List.of("경기", "경기도"),
            List.of("용인시처인구", "처인구", "용인시"),
            List.of("역북동"),
            true,
            37.2370,
            127.2023
        ),
        new ServiceArea(
            "seoul-mapo-seogyo",
            "서울특별시 마포구 서교동",
            "서울특별시",
            "마포구",
            "서교동",
            List.of("서울", "서울특별시"),
            List.of("마포구"),
            List.of("서교동", "합정동", "동교동"),
            false,
            37.5555,
            126.9216
        )
    );

    public List<ServiceArea> areas() {
        return SERVICE_AREAS;
    }

    public String serviceRegionLabel() {
        return SERVICE_AREAS.stream()
            .map(ServiceArea::name)
            .reduce((left, right) -> left + " / " + right)
            .orElse("");
    }

    public boolean isAllowed(String region1, String region2, String region3) {
        return resolve(region1, region2, region3) != null;
    }

    public ServiceArea resolve(String region1, String region2, String region3) {
        String normalizedRegion1 = normalize(region1);
        String normalizedRegion2 = normalize(region2);
        String normalizedRegion3 = normalize(region3);

        return SERVICE_AREAS.stream()
            .filter(area ->
                matchesAlias(normalizedRegion1, area.region1Aliases())
                    && matchesAlias(normalizedRegion2, area.region2Aliases())
                    && matchesRegion3(normalizedRegion3, area.region3Aliases(), area.allowVillageSubregions())
            )
            .findFirst()
            .orElse(null);
    }

    public ServiceArea findBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return null;
        }

        return SERVICE_AREAS.stream()
            .filter(area -> area.slug().equalsIgnoreCase(slug))
            .findFirst()
            .orElse(null);
    }

    public List<String> buildSearchQueries(String query) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.isEmpty()) {
            return List.of();
        }

        Set<String> values = new LinkedHashSet<>();
        values.add(trimmed);

        for (ServiceArea area : SERVICE_AREAS) {
            values.add(area.name() + " " + trimmed);
            values.add(area.district() + " " + trimmed);
            values.add(area.neighborhood() + " " + trimmed);
        }

        return values.stream().toList();
    }

    private boolean matchesRegion3(String actual, List<String> aliases, boolean allowVillageSubregions) {
        if (matchesAlias(actual, aliases)) {
            return true;
        }

        if (!allowVillageSubregions || actual.isEmpty()) {
            return false;
        }

        return actual.endsWith("리") || aliases.stream().map(this::normalize).anyMatch(actual::contains);
    }

    private boolean matchesAlias(String actual, List<String> aliases) {
        if (actual.isEmpty()) {
            return false;
        }

        return aliases.stream()
            .map(this::normalize)
            .anyMatch(alias -> actual.equals(alias) || actual.contains(alias) || alias.contains(actual));
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value.replace(" ", "").toLowerCase(Locale.ROOT);
    }

    public record ServiceArea(
        String slug,
        String name,
        String city,
        String district,
        String neighborhood,
        List<String> region1Aliases,
        List<String> region2Aliases,
        List<String> region3Aliases,
        boolean allowVillageSubregions,
        double lat,
        double lng
    ) {
    }
}
