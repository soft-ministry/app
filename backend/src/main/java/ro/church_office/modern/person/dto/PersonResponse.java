package ro.church_office.modern.person.dto;

import java.time.Instant;
import java.time.LocalDate;

import ro.church_office.modern.person.dao.MemberType;
import ro.church_office.modern.person.dao.Person;
import ro.church_office.modern.person.dao.PersonStatus;

public record PersonResponse(
        Long id,
        Long churchId,
        String firstName,
        String lastName,
        String fullName,
        String email,
        String phone,
        String address,
        String churchRole,
        String position,
        String description,
        String publicDescription,
        String privateDescription,
        boolean descriptionPrivate,
        boolean descriptionVisible,
        LocalDate birthDate,
        MemberType memberType,
        boolean active,
        PersonStatus status,
        LocalDate statusChangedDate,
        String statusDetails,
        boolean statusPhotoAvailable,
        String statusPhotoFileName,
        Instant createdAt,
        Instant updatedAt
) {
    public static PersonResponse from(Person person, String username) {
        String publicDescription = legacyPublicDescription(person);
        String privateDescription = privateDescription(person, username);
        return new PersonResponse(
                person.getId(),
                person.getChurchId(),
                person.getFirstName(),
                person.getLastName(),
                fullName(person),
                person.getEmail(),
                person.getPhone(),
                person.getAddress(),
                person.getChurchRole(),
                person.getPosition(),
                combine(publicDescription, privateDescription),
                publicDescription,
                privateDescription,
                hasText(privateDescription),
                true,
                person.getBirthDate(),
                person.getMemberType(),
                person.isActive(),
                person.getStatus(),
                person.getStatusChangedDate(),
                person.getStatusDetails(),
                (person.getStatus() == PersonStatus.DECEASED
                        || person.getStatus() == PersonStatus.TRANSFERRED
                        || person.getStatus() == PersonStatus.WITHDRAWN)
                        && hasText(person.getStatusPhotoStoragePath()),
                person.getStatusPhotoFileName(),
                person.getCreatedAt(),
                person.getUpdatedAt());
    }

    private static String fullName(Person person) {
        return (safe(person.getFirstName()) + " " + safe(person.getLastName())).trim();
    }

    private static String safe(String value) {
        return value == null ? "" : value;
    }

    private static String legacyPublicDescription(Person person) {
        return person.isDescriptionPrivate() ? null : person.getDescription();
    }

    private static String privateDescription(Person person, String username) {
        if (username == null) {
            return null;
        }
        String current = person.getPrivateDescriptions().entrySet().stream()
                .filter(entry -> entry.getKey() != null && entry.getKey().equalsIgnoreCase(username))
                .map(java.util.Map.Entry::getValue)
                .filter(PersonResponse::hasText)
                .findFirst()
                .orElse(null);
        if (current != null) {
            return current;
        }
        if (person.isDescriptionPrivate()
                && person.getDescriptionOwnerUsername() != null
                && person.getDescriptionOwnerUsername().equalsIgnoreCase(username)) {
            return person.getDescription();
        }
        return null;
    }

    private static String combine(String publicDescription, String privateDescription) {
        if (hasText(publicDescription) && hasText(privateDescription)) {
            return publicDescription.trim() + "\n\n" + privateDescription.trim();
        }
        if (hasText(publicDescription)) {
            return publicDescription.trim();
        }
        return hasText(privateDescription) ? privateDescription.trim() : null;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
