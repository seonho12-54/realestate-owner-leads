package com.downy.api.location;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class ServiceAreaSupport {

    private static final List<ServiceArea> SERVICE_AREAS = List.of(
        new ServiceArea("울산광역시 중구 다운동", "울산광역시", "중구", "다운동", 35.5571, 129.3292),
        new ServiceArea("경기도 용인시 처인구 포곡읍", "경기도", "용인시 처인구", "포곡읍", 37.2799, 127.2172)
    );

    public List<ServiceArea> areas() {
        return SERVICE_AREAS;
    }

    public String serviceRegionLabel() {
        return SERVICE_AREAS.stream().map(ServiceArea::label).reduce((left, right) -> left + " / " + right).orElse("");
    }

    public boolean isAllowed(String region1, String region2, String region3) {
        return SERVICE_AREAS.stream().anyMatch(area ->
            area.region1().equals(region1) && area.region2().equals(region2) && area.region3().equals(region3)
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

    public record ServiceArea(String label, String region1, String region2, String region3, double lat, double lng) {
    }
}
