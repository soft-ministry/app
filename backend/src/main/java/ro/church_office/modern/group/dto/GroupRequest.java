package ro.church_office.modern.group.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;

import ro.church_office.modern.group.dao.GroupType;

public record GroupRequest(
        @NotBlank String name,
        GroupType type,
        String description,
        String whatsappLink,
        Long leaderId,
        List<Long> memberIds
) {
}
