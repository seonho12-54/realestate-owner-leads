package com.downy.api.lead;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.downy.api.auth.SessionModels.AdminSession;
import com.downy.api.auth.SessionService;
import com.downy.api.location.RegionAccessService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ListingControllerTest {

    @Mock
    private LeadService leadService;

    @Mock
    private RegionAccessService regionAccessService;

    @Mock
    private SessionService sessionService;

    @Mock
    private HttpServletRequest request;

    private ListingController controller;

    @BeforeEach
    void setUp() {
        controller = new ListingController(leadService, regionAccessService, sessionService);
    }

    @Test
    void adminCanReadPublishedDetailWithoutVerifiedRegion() {
        LeadDtos.LeadDetailResponse response = sampleResponse();

        when(sessionService.readAdminSession(request)).thenReturn(new AdminSession(1L, 10L, "admin@example.com", "관리자", "admin", 0L));
        when(leadService.getPublishedListingDetail(42L, null)).thenReturn(response);

        LeadDtos.LeadDetailResponse result = controller.getListingDetail(42L, request);

        assertSame(response, result);
        verify(regionAccessService, never()).requireVerifiedRegionSlug(request);
        verify(leadService).incrementViewCount(42L, null);
    }

    @Test
    void verifiedRegionIsStillRequiredForNonAdminDetailAccess() {
        LeadDtos.LeadDetailResponse response = sampleResponse();

        when(sessionService.readAdminSession(request)).thenReturn(null);
        when(regionAccessService.requireVerifiedRegionSlug(request)).thenReturn("yongin-cheoin-yubang");
        when(leadService.getPublishedListingDetail(42L, "yongin-cheoin-yubang")).thenReturn(response);

        LeadDtos.LeadDetailResponse result = controller.getListingDetail(42L, request);

        assertSame(response, result);
        verify(regionAccessService).requireVerifiedRegionSlug(request);
        verify(leadService).incrementViewCount(42L, "yongin-cheoin-yubang");
    }

    private LeadDtos.LeadDetailResponse sampleResponse() {
        return new LeadDtos.LeadDetailResponse(
            42L,
            "유방동 신축 투룸",
            "villa",
            "monthly",
            "yongin-cheoin-yubang",
            "경기도 용인시 처인구 유방동",
            null,
            "유방동",
            49.5,
            null,
            10_000_000L,
            600_000L,
            "채광이 좋은 투룸",
            37.2321,
            127.2108,
            Instant.parse("2026-04-10T00:00:00Z"),
            "동네부동산",
            "031-000-0000",
            0,
            null,
            "경기도 용인시 처인구",
            "평일 10:00~18:00",
            "즉시 입주",
            List.of()
        );
    }
}
