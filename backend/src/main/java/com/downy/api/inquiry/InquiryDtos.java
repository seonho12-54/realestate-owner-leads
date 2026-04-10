package com.downy.api.inquiry;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class InquiryDtos {

    private InquiryDtos() {
    }

    public record CreateInquiryRequest(
        @NotBlank @Size(min = 2, max = 160) String title,
        @NotBlank @Size(min = 5, max = 5000) String content,
        boolean secret
    ) {
    }

    public record CreateInquiryResponse(long id) {
    }

    public record InquirySummaryResponse(
        long id,
        String title,
        String authorName,
        boolean secret,
        boolean mine,
        boolean canRead,
        boolean answered,
        String status,
        Instant createdAt,
        String previewText
    ) {
    }

    public record InquiryDetailResponse(
        long id,
        String title,
        String authorName,
        boolean secret,
        boolean mine,
        boolean canRead,
        boolean answered,
        String status,
        Instant createdAt,
        String content,
        String adminReply,
        Instant adminReplyAt,
        String adminReplyAdminName
    ) {
    }

    public record AdminReplyRequest(@NotBlank @Size(min = 2, max = 5000) String reply) {
    }

    public record AdminReplyResponse(boolean ok) {
    }
}
