package ro.church_office.modern.family.dto;

import jakarta.validation.constraints.NotNull;

import ro.church_office.modern.family.dao.FamilyRole;

public record FamilyMemberRequest(
        @NotNull Long personId,
        FamilyRole role,
        boolean primaryMember
) {
}
