package ro.church_office.modern.social.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import ro.church_office.modern.social.dao.SocialNeedType;
import ro.church_office.modern.social.dao.SocialSupportPriority;
import ro.church_office.modern.social.dao.SocialSupportStatus;

public record SocialSupportCaseRequest(
        @NotNull Long personId,
        Long assignedToId,
        SocialNeedType needType,
        SocialSupportStatus status,
        SocialSupportPriority priority,
        @NotBlank String summary,
        String privateNotes,
        BigDecimal estimatedAmount,
        BigDecimal approvedAmount,
        LocalDate nextReviewDate,
        LocalDate closedAt
) {
}
