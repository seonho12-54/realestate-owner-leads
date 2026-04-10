package com.downy.api.inquiry;

import com.downy.api.auth.SessionModels.SessionSnapshot;
import com.downy.api.auth.SessionModels.UserSession;
import com.downy.api.auth.SessionService;
import com.downy.api.common.RequestMeta;
import com.downy.api.inquiry.InquiryDtos.CreateInquiryRequest;
import com.downy.api.inquiry.InquiryDtos.CreateInquiryResponse;
import com.downy.api.inquiry.InquiryDtos.InquiryDetailResponse;
import com.downy.api.inquiry.InquiryDtos.InquirySummaryResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/inquiries")
public class InquiryController {

    private final InquiryService inquiryService;
    private final SessionService sessionService;

    public InquiryController(InquiryService inquiryService, SessionService sessionService) {
        this.inquiryService = inquiryService;
        this.sessionService = sessionService;
    }

    @GetMapping
    public List<InquirySummaryResponse> list(HttpServletRequest request) {
        SessionSnapshot snapshot = sessionService.readSnapshot(request);
        Long viewerUserId = snapshot.user() != null ? snapshot.user().userId() : null;
        boolean adminView = snapshot.admin() != null;
        return inquiryService.listInquiries(viewerUserId, adminView);
    }

    @GetMapping("/{inquiryId}")
    public InquiryDetailResponse detail(@PathVariable long inquiryId, HttpServletRequest request) {
        SessionSnapshot snapshot = sessionService.readSnapshot(request);
        Long viewerUserId = snapshot.user() != null ? snapshot.user().userId() : null;
        boolean adminView = snapshot.admin() != null;
        return inquiryService.getInquiryDetail(inquiryId, viewerUserId, adminView);
    }

    @PostMapping
    public CreateInquiryResponse create(@Valid @RequestBody CreateInquiryRequest request, HttpServletRequest httpRequest) {
        UserSession userSession = sessionService.requireUser(httpRequest);
        long inquiryId = inquiryService.createInquiry(request, userSession.userId(), RequestMeta.from(httpRequest));
        return new CreateInquiryResponse(inquiryId);
    }
}
