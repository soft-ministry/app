package ro.church_office.modern.family.dto;

import ro.church_office.modern.family.dao.FamilyMember;
import ro.church_office.modern.family.dao.FamilyRole;
import ro.church_office.modern.person.dao.Person;

public record FamilyMemberResponse(
        Long id,
        Long personId,
        String firstName,
        String lastName,
        String fullName,
        FamilyRole role,
        boolean primaryMember
) {
    public static FamilyMemberResponse from(FamilyMember member, Person person) {
        return new FamilyMemberResponse(
                member.getId(),
                member.getPersonId(),
                person.getFirstName(),
                person.getLastName(),
                fullName(person),
                member.getRole(),
                member.isPrimaryMember()
        );
    }

    private static String fullName(Person person) {
        return (safe(person.getFirstName()) + " " + safe(person.getLastName())).trim();
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }
}
