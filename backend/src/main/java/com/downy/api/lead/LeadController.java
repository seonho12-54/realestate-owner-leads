package com.downy.api.lead;

import com.downy.api.auth.SessionService;
import com.downy.api.common.RequestMeta;
import com.downy.api.lead.LeadDtos.CreateLeadRequest;
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

    public LeadController(LeadService leadService, SessionService sessionService) {
        this.leadService = leadService;
        this.sessionService = sessionService;
    }

    @PostMapping
    public CreateLeadResponse createLead(@Valid @RequestBody CreateLeadRequest request, HttpServletRequest httpRequest) {
        long leadId = leadService.createLead(request, RequestMeta.from(httpRequest), sessionService.readSnapshot(httpRequest));
        return new CreateLeadResponse(leadId);
    }

    public record CreateLeadResponse(long id) {
    }
}
