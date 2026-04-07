package com.downy.api.lead;

import com.downy.api.auth.SessionService;
import com.downy.api.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/listings")
public class PublicListingController {

    private final LeadService leadService;
    private final SessionService sessionService;

    public PublicListingController(LeadService leadService, SessionService sessionService) {
        this.leadService = leadService;
        this.sessionService = sessionService;
    }

    @GetMapping
    public List<LeadDtos.PublicListingResponse> listPublishedListings() {
        return leadService.listPublishedListings();
    }

    @GetMapping("/{leadId}")
    public LeadDtos.LeadDetailResponse getPublishedListingDetail(@PathVariable long leadId, HttpServletRequest request) {
        if (!sessionService.hasUserOrAdmin(request)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "로그인 후 매물 상세를 확인할 수 있습니다.");
        }

        LeadDtos.LeadDetailResponse response = leadService.getPublishedListingDetail(leadId);
        leadService.incrementViewCount(leadId);
        return response;
    }
}
