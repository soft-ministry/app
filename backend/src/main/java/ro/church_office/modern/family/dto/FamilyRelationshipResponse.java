package ro.church_office.modern.family.dto;

import ro.church_office.modern.family.dao.FamilyRelationship;
import ro.church_office.modern.family.dao.FamilyRelationshipType;

public record FamilyRelationshipResponse(
        Long id,
        Long personAId,
        Long personBId,
        String personAName,
        String personBName,
        FamilyRelationshipType type
) {
    public static FamilyRelationshipResponse from(FamilyRelationship relationship,
            String personAName,
            String personBName) {
        return new FamilyRelationshipResponse(
                relationship.getId(),
                relationship.getPersonAId(),
                relationship.getPersonBId(),
                personAName,
                personBName,
                relationship.getType()
        );
    }
}
