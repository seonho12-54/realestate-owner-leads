package com.downy.api.location;

import com.downy.api.common.RequestMeta;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/region")
public class RegionController {

    private final RegionAccessService regionAccessService;

    public RegionController(RegionAccessService regionAccessService) {
        this.regionAccessService = regionAccessService;
    }

    @GetMapping("/me")
    public RegionAccessService.RegionStatusResponse currentRegion(HttpServletRequest request) {
        return regionAccessService.getRegionStatus(request);
    }

    @PostMapping("/reverify")
    public RegionAccessService.RegionStatusResponse reverify(
        @Valid @RequestBody ReverifyRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse response
    ) {
        return regionAccessService.verifyAndLock(
            request.latitude(),
            request.longitude(),
            httpRequest,
            response,
            RequestMeta.from(httpRequest),
            true
        );
    }

    public record ReverifyRequest(
        @Min(33) @Max(39) double latitude,
        @Min(124) @Max(132) double longitude
    ) {
    }
}
