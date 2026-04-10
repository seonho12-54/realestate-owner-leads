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
    void returnsNullForUnsupportedArea() {
        ServiceAreaSupport.ServiceArea area = serviceAreaSupport.resolve("부산광역시", "해운대구", "우동");

        assertNull(area);
    }
}
