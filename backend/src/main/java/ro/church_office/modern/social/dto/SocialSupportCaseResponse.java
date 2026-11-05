package ro.church_office.modern.social.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

import ro.church_office.modern.person.dao.Person;
import ro.church_office.modern.social.dao.SocialNeedType;
import ro.church_office.modern.social.dao.SocialSupportCase;
import ro.church_office.modern.social.dao.SocialSupportPriority;
import ro.church_office.modern.social.dao.SocialSupportStatus;

public record SocialSupportCaseResponse(
        Long id,
        Long churchId,
        Long personId,
        String personName,
        Long assignedToId,
        String assignedToName,
        SocialNeedType needType,
        SocialSupportStatus status,
        SocialSupportPriority priority,
        String summary,
        String privateNotes,
        BigDecimal estimatedAmount,
        BigDecimal approvedAmount,
        LocalDate nextReviewDate,
        LocalDate closedAt,
        Instant createdAt,
        Instant updatedAt
) {
    public static SocialSupportCaseResponse from(SocialSupportCase item) {
        return new SocialSupportCaseResponse(
                item.getId(),
                item.getChurchId(),
                item.getPerson().getId(),
                fullName(item.getPerson()),
                item.getAssignedTo() == null ? null : item.getAssignedTo().getId(),
                item.getAssignedTo() == null ? null : fullName(item.getAssignedTo()),
                item.getNeedType(),
                item.getStatus(),
                item.getPriority(),
                item.getSummary(),
                item.getPrivateNotes(),
                item.getEstimatedAmount(),
                item.getApprovedAmount(),
                item.getNextReviewDate(),
                item.getClosedAt(),
                item.getCreatedAt(),
                item.getUpdatedAt());
    }

    private static String fullName(Person person) {
        return ((person.getFirstName() == null ? "" : person.getFirstName()) + " "
                + (person.getLastName() == null ? "" : person.getLastName())).trim();
    }
}
