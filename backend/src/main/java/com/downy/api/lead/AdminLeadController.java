package com.downy.api.lead;

import com.downy.api.auth.SessionService;
import com.downy.api.auth.SessionModels.AdminSession;
import com.downy.api.common.RequestMeta;
import com.downy.api.lead.LeadDtos.AdminLeadSummaryResponse;
import com.downy.api.lead.LeadDtos.AdminLeadUpdateRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/leads")
public class AdminLeadController {

    private final LeadService leadService;
    private final SessionService sessionService;

    public AdminLeadController(LeadService leadService, SessionService sessionService) {
        this.leadService = leadService;
        this.sessionService = sessionService;
    }

    @GetMapping
    public List<AdminLeadSummaryResponse> list(
        @RequestParam(name = "status", required = false) String status,
        HttpServletRequest request
    ) {
        sessionService.requireAdmin(request);
        return leadService.listAdminLeads(status);
    }

    @PatchMapping("/{leadId}")
    public UpdateLeadResponse update(
        @PathVariable long leadId,
        @Valid @RequestBody AdminLeadUpdateRequest request,
        HttpServletRequest httpRequest
    ) {
        AdminSession adminSession = sessionService.requireAdmin(httpRequest);
        leadService.updateLeadAdminFields(leadId, request, adminSession.adminId(), RequestMeta.from(httpRequest));
        return new UpdateLeadResponse(true);
    }

    public record UpdateLeadResponse(boolean success) {
    }
}
