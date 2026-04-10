package com.downy.api.lead;

import com.downy.api.auth.SessionService;
import com.downy.api.location.RegionAccessService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/listings")
public class ListingController {

    private final LeadService leadService;
    private final RegionAccessService regionAccessService;
    private final SessionService sessionService;

    public ListingController(LeadService leadService, RegionAccessService regionAccessService, SessionService sessionService) {
        this.leadService = leadService;
        this.regionAccessService = regionAccessService;
        this.sessionService = sessionService;
    }

    @GetMapping("/preview")
    public List<LeadDtos.PublicListingResponse> previewListings(@RequestParam(defaultValue = "6") int limit) {
        return leadService.listPreviewListings(limit);
    }

    @GetMapping
    public List<LeadDtos.PublicListingResponse> listListings(HttpServletRequest request) {
        String regionSlug = regionAccessService.requireVerifiedRegionSlug(request);
        return leadService.listPublishedListings(regionSlug);
    }

    @GetMapping("/{leadId}")
    public LeadDtos.LeadDetailResponse getListingDetail(@PathVariable long leadId, HttpServletRequest request) {
        String regionSlug = sessionService.readAdminSession(request) != null ? null : regionAccessService.requireVerifiedRegionSlug(request);
        LeadDtos.LeadDetailResponse response = leadService.getPublishedListingDetail(leadId, regionSlug);
        leadService.incrementViewCount(leadId, regionSlug);
        return response;
    }
}
