package com.downy.api.inquiry;

import com.downy.api.auth.SessionModels.AdminSession;
import com.downy.api.auth.SessionService;
import com.downy.api.common.RequestMeta;
import com.downy.api.inquiry.InquiryDtos.AdminReplyRequest;
import com.downy.api.inquiry.InquiryDtos.AdminReplyResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/inquiries")
public class AdminInquiryController {

    private final InquiryService inquiryService;
    private final SessionService sessionService;

    public AdminInquiryController(InquiryService inquiryService, SessionService sessionService) {
        this.inquiryService = inquiryService;
        this.sessionService = sessionService;
    }

    @PatchMapping("/{inquiryId}/reply")
    public AdminReplyResponse reply(
        @PathVariable long inquiryId,
        @Valid @RequestBody AdminReplyRequest request,
        HttpServletRequest httpRequest
    ) {
        AdminSession adminSession = sessionService.requireAdmin(httpRequest);
        inquiryService.replyToInquiry(inquiryId, request.reply(), adminSession.adminId(), RequestMeta.from(httpRequest));
        return new AdminReplyResponse(true);
    }
}
