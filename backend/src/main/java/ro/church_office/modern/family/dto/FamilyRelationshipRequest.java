package ro.church_office.modern.family.dto;

import jakarta.validation.constraints.NotNull;

import ro.church_office.modern.family.dao.FamilyRelationshipType;

public record FamilyRelationshipRequest(
        @NotNull Long personAId,
        @NotNull Long personBId,
        @NotNull FamilyRelationshipType type
) {
}
