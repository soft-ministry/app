package ro.church_office.modern.group.dto;

import java.time.Instant;
import java.util.List;

import ro.church_office.modern.group.dao.ChurchGroup;
import ro.church_office.modern.group.dao.GroupType;
import ro.church_office.modern.person.dao.Person;

public record GroupResponse(
        Long id,
        Long churchId,
        String name,
        GroupType type,
        String description,
        String whatsappLink,
        Long leaderId,
        String leaderName,
        List<Long> memberIds,
        int memberCount,
        Instant createdAt,
        Instant updatedAt
) {
    public static GroupResponse from(ChurchGroup group) {
        List<Long> memberIds = group.getMembers().stream()
                .map(Person::getId)
                .sorted()
                .toList();
        return new GroupResponse(
                group.getId(),
                group.getChurchId(),
                group.getName(),
                group.getType(),
                group.getDescription(),
                group.getWhatsappLink(),
                group.getLeader() == null ? null : group.getLeader().getId(),
                group.getLeader() == null ? null : fullName(group.getLeader()),
                memberIds,
                memberIds.size(),
                group.getCreatedAt(),
                group.getUpdatedAt());
    }

    private static String fullName(Person person) {
        return ((person.getFirstName() == null ? "" : person.getFirstName()) + " "
                + (person.getLastName() == null ? "" : person.getLastName())).trim();
    }
}
