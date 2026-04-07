package com.downy.api.location;

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

    public LocationController(KakaoLocationService kakaoLocationService) {
        this.kakaoLocationService = kakaoLocationService;
    }

    @PostMapping("/verify")
    public KakaoLocationService.VerificationResponse verify(@Valid @RequestBody VerifyRequest request) {
        return kakaoLocationService.verify(request.latitude(), request.longitude());
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
