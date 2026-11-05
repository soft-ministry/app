package ro.church_office.modern.family.dto;

import java.util.List;

import ro.church_office.modern.family.dao.Family;

public record FamilyResponse(
        Long id,
        String name,
        String notes,
        List<FamilyMemberResponse> members,
        List<FamilyRelationshipResponse> relationships
) {
    public static FamilyResponse from(Family family,
            List<FamilyMemberResponse> members,
            List<FamilyRelationshipResponse> relationships) {
        return new FamilyResponse(
                family.getId(),
                family.getName(),
                family.getNotes(),
                members,
                relationships
        );
    }
}
