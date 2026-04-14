package com.downy.api.location;

import com.downy.api.common.RequestMeta;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/location")
public class LocationController {

    private final KakaoLocationService kakaoLocationService;
    private final RegionAccessService regionAccessService;

    public LocationController(KakaoLocationService kakaoLocationService, RegionAccessService regionAccessService) {
        this.kakaoLocationService = kakaoLocationService;
        this.regionAccessService = regionAccessService;
    }

    @PostMapping("/verify")
    public RegionAccessService.RegionStatusResponse verify(
        @Valid @RequestBody VerifyRequest request,
        HttpServletRequest httpRequest,
        HttpServletResponse response
    ) {
        return regionAccessService.verifyAndLock(
            request.latitude(),
            request.longitude(),
            httpRequest,
            response,
            RequestMeta.from(httpRequest),
            false
        );
    }

    @GetMapping("/address-search")
    public Map<String, List<KakaoLocationService.AddressSearchResult>> search(@RequestParam @Size(min = 2, max = 120) String query) {
        return Map.of("results", kakaoLocationService.searchAddresses(query));
    }

    public record VerifyRequest(
        @Min(33) @Max(39) double latitude,
        @Min(124) @Max(132) double longitude
    ) {
    }
}
