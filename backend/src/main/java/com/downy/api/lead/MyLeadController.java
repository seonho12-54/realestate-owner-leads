package com.downy.api.lead;

import com.downy.api.auth.SessionModels.UserSession;
import com.downy.api.auth.SessionService;
import com.downy.api.common.RequestMeta;
import com.downy.api.lead.LeadDtos.MyLeadSummaryResponse;
import com.downy.api.lead.LeadDtos.UserLeadUpdateRequest;
import com.downy.api.location.RegionAccessService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me/leads")
public class MyLeadController {

    private final LeadService leadService;
    private final SessionService sessionService;
    private final RegionAccessService regionAccessService;

    public MyLeadController(LeadService leadService, SessionService sessionService, RegionAccessService regionAccessService) {
        this.leadService = leadService;
        this.sessionService = sessionService;
        this.regionAccessService = regionAccessService;
    }

    @GetMapping
    public List<MyLeadSummaryResponse> list(HttpServletRequest request) {
        UserSession userSession = sessionService.requireUser(request);
        return leadService.listUserLeads(userSession.userId());
    }

    @PatchMapping("/{leadId}")
    public UpdateResponse update(
        @PathVariable long leadId,
        @Valid @RequestBody UserLeadUpdateRequest request,
        HttpServletRequest httpRequest
    ) {
        UserSession userSession = sessionService.requireUser(httpRequest);
        leadService.updateUserLead(
            leadId,
            userSession.userId(),
            request,
            RequestMeta.from(httpRequest),
            regionAccessService.requireVerifiedRegionSlug(httpRequest)
        );
        return new UpdateResponse(true);
    }

    public record UpdateResponse(boolean ok) {
    }
}
