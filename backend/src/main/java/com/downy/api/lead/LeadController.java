package com.downy.api.lead;

import com.downy.api.auth.SessionService;
import com.downy.api.common.RequestMeta;
import com.downy.api.lead.LeadDtos.CreateLeadRequest;
import com.downy.api.location.RegionAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/leads")
public class LeadController {

    private final LeadService leadService;
    private final SessionService sessionService;
    private final RegionAccessService regionAccessService;

    public LeadController(LeadService leadService, SessionService sessionService, RegionAccessService regionAccessService) {
        this.leadService = leadService;
        this.sessionService = sessionService;
        this.regionAccessService = regionAccessService;
    }

    @PostMapping
    public CreateLeadResponse createLead(@Valid @RequestBody CreateLeadRequest request, HttpServletRequest httpRequest) {
        var sessionSnapshot = sessionService.readSnapshot(httpRequest);
        String verifiedRegionSlug = sessionSnapshot.admin() != null ? null : regionAccessService.requireVerifiedRegionSlug(httpRequest);
        long leadId = leadService.createLead(request, RequestMeta.from(httpRequest), sessionSnapshot, verifiedRegionSlug);
        return new CreateLeadResponse(leadId);
    }

    public record CreateLeadResponse(long id) {
    }
}
