package com.downy.api.lead;

import com.downy.api.auth.SessionService;
import com.downy.api.location.RegionAccessService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/listings")
public class PublicListingController {

    private final LeadService leadService;
    private final RegionAccessService regionAccessService;
    private final SessionService sessionService;

    public PublicListingController(LeadService leadService, RegionAccessService regionAccessService, SessionService sessionService) {
        this.leadService = leadService;
        this.regionAccessService = regionAccessService;
        this.sessionService = sessionService;
    }

    @GetMapping
    public List<LeadDtos.PublicListingResponse> listPublishedListings(HttpServletRequest request) {
        String regionSlug = regionAccessService.requireVerifiedRegionSlug(request);
        return leadService.listPublishedListings(regionSlug);
    }

    @GetMapping("/{leadId}")
    public LeadDtos.LeadDetailResponse getPublishedListingDetail(@PathVariable long leadId, HttpServletRequest request) {
        String regionSlug = sessionService.readAdminSession(request) != null ? null : regionAccessService.requireVerifiedRegionSlug(request);
        LeadDtos.LeadDetailResponse response = leadService.getPublishedListingDetail(leadId, regionSlug);
        leadService.incrementViewCount(leadId, regionSlug);
        return response;
    }
}
