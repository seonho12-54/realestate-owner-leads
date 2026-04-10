package com.downy.api.location;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

class ServiceAreaSupportTest {

    private final ServiceAreaSupport serviceAreaSupport = new ServiceAreaSupport();

    @Test
    void resolvesKnownServiceAreaFromRegionNames() {
        ServiceAreaSupport.ServiceArea area = serviceAreaSupport.resolve("서울특별시", "마포구", "서교동");

        assertNotNull(area);
        assertEquals("seoul-mapo-seogyo", area.slug());
        assertEquals("서울특별시 마포구 서교동", area.name());
    }

    @Test
    void resolvesYubangFromRegionNames() {
        ServiceAreaSupport.ServiceArea area = serviceAreaSupport.resolve("경기도", "용인시 처인구", "유방동");

        assertNotNull(area);
        assertEquals("yongin-cheoin-yubang", area.slug());
        assertEquals("경기도 용인시 처인구 유방동", area.name());
    }

    @Test
    void resolvesYubangFromCoordinates() {
        ServiceAreaSupport.ServiceArea area = serviceAreaSupport.resolveByCoordinates(37.2321, 127.2108);

        assertNotNull(area);
        assertEquals("yongin-cheoin-yubang", area.slug());
    }

    @Test
    void resolvesPogokFromCoordinates() {
        ServiceAreaSupport.ServiceArea area = serviceAreaSupport.resolveByCoordinates(37.2709846, 127.2088124);

        assertNotNull(area);
        assertEquals("yongin-cheoin-pogok", area.slug());
    }

    @Test
    void returnsNullForUnsupportedArea() {
        ServiceAreaSupport.ServiceArea area = serviceAreaSupport.resolve("부산광역시", "해운대구", "우동");

        assertNull(area);
    }
}
