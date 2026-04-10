package com.downy.api.location;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.downy.api.auth.SessionModels.RegionSession;
import com.downy.api.auth.SessionService;
import com.downy.api.common.ApiException;
import com.downy.api.common.RequestMeta;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class RegionAccessServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private SessionService sessionService;

    @Mock
    private KakaoLocationService kakaoLocationService;

    @Mock
    private HttpServletRequest request;

    @Mock
    private HttpServletResponse response;

    private RegionAccessService regionAccessService;

    @BeforeEach
    void setUp() {
        regionAccessService = new RegionAccessService(jdbcTemplate, sessionService, kakaoLocationService, new ServiceAreaSupport());
    }

    @Test
    void requireVerifiedRegionThrowsWhenUnlocked() {
        when(sessionService.readUserSession(request)).thenReturn(null);
        when(sessionService.readRegionSession(request)).thenReturn(null);

        ApiException exception = assertThrows(ApiException.class, () -> regionAccessService.requireVerifiedRegion(request));

        assertEquals(RegionAccessService.REGION_VERIFICATION_REQUIRED, exception.getCode());
    }

    @Test
    void verifyAndLockRejectsDifferentRegionWithoutExplicitReverify() {
        when(sessionService.readUserSession(request)).thenReturn(null);
        when(sessionService.readRegionSession(request))
            .thenReturn(new RegionSession("ulsan-junggu-daun", "울산광역시 중구 다운동", true, 1L, 1L));
        when(kakaoLocationService.verify(anyDouble(), anyDouble()))
            .thenReturn(new KakaoLocationService.VerificationResponse(
                true,
                "서울특별시 마포구 서교동",
                "서울특별시",
                "마포구",
                "서교동",
                "seoul-mapo-seogyo",
                "서울특별시 마포구 서교동"
            ));

        ApiException exception = assertThrows(
            ApiException.class,
            () -> regionAccessService.verifyAndLock(37.55, 126.92, request, response, new RequestMeta("127.0.0.1", "JUnit"), false)
        );

        assertEquals(RegionAccessService.REGION_CHANGE_REQUIRES_REVERIFY, exception.getCode());
        verify(sessionService, never()).setRegionSession(any(HttpServletResponse.class), any(), any(), eq(true), anyLong());
    }

    @Test
    void verifyAndLockStoresRegionForGuestSession() {
        when(sessionService.readUserSession(request)).thenReturn(null);
        when(sessionService.readRegionSession(request)).thenReturn(null);
        when(kakaoLocationService.verify(anyDouble(), anyDouble()))
            .thenReturn(new KakaoLocationService.VerificationResponse(
                true,
                "울산광역시 중구 다운동",
                "울산광역시",
                "중구",
                "다운동",
                "ulsan-junggu-daun",
                "울산광역시 중구 다운동"
            ));

        RegionAccessService.RegionStatusResponse status =
            regionAccessService.verifyAndLock(35.55, 129.32, request, response, new RequestMeta("127.0.0.1", "JUnit"), false);

        assertTrue(status.locked());
        assertEquals("ulsan-junggu-daun", status.region().slug());
        verify(sessionService).setRegionSession(response, "ulsan-junggu-daun", "울산광역시 중구 다운동", true, status.verifiedAt());
    }
}
