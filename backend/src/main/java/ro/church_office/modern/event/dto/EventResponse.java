package ro.church_office.modern.event.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;

import ro.church_office.modern.event.dao.Event;
import ro.church_office.modern.event.dao.EventStatus;
import ro.church_office.modern.event.dao.EventType;
import ro.church_office.modern.event.dao.Priority;
import ro.church_office.modern.event.dao.RecurrenceType;
import ro.church_office.modern.person.dao.Person;

public record EventResponse(
        Long id,
        Long churchId,
        String eventName,
        String about,
        String publicAbout,
        String privateAbout,
        boolean aboutPrivate,
        boolean aboutVisible,
        LocalDate openDate,
        LocalDate endDate,
        @JsonFormat(pattern = "HH:mm")
        LocalTime eventTime,
        EventStatus status,
        EventType eventType,
        Priority priority,
        RecurrenceType recurrenceType,
        Long groupId,
        String groupName,
        Long implementedById,
        String implementedByName,
        Long contactedPersonId,
        String contactedPersonName,
        List<Long> contactedPersonIds,
        List<String> contactedPersonNames,
        List<Long> responsibleIds,
        List<String> responsibleNames,
        Instant createdAt,
        Instant updatedAt
) {
    public static EventResponse from(Event event, String username) {
        Person implementedBy = event.getImplementedBy();
        Person contactedPerson = event.getContactedPerson();
        List<Person> contactedPeople = event.getContactedPersons().stream().toList();
        if (contactedPeople.isEmpty() && contactedPerson != null) {
            contactedPeople = List.of(contactedPerson);
        }
        List<Person> responsibles = event.getResponsiblePersons().stream().toList();
        if (responsibles.isEmpty() && implementedBy != null) {
            responsibles = List.of(implementedBy);
        }
        String publicAbout = legacyPublicAbout(event);
        String privateAbout = privateAbout(event, username);
        return new EventResponse(
                event.getId(),
                event.getChurchId(),
                event.getEventName(),
                combine(publicAbout, privateAbout),
                publicAbout,
                privateAbout,
                hasText(privateAbout),
                true,
                event.getOpenDate(),
                event.getEndDate(),
                event.getEventTime(),
                event.getStatus(),
                event.getEventType(),
                event.getPriority(),
                event.getRecurrenceType(),
                event.getAssociatedGroup() == null ? null : event.getAssociatedGroup().getId(),
                event.getAssociatedGroup() == null ? null : event.getAssociatedGroup().getName(),
                implementedBy == null ? null : implementedBy.getId(),
                implementedBy == null ? null : fullName(implementedBy),
                contactedPerson == null ? null : contactedPerson.getId(),
                contactedPerson == null ? null : fullName(contactedPerson),
                contactedPeople.stream().map(Person::getId).toList(),
                contactedPeople.stream().map(EventResponse::fullName).toList(),
                responsibles.stream().map(Person::getId).toList(),
                responsibles.stream().map(EventResponse::fullName).toList(),
                event.getCreatedAt(),
                event.getUpdatedAt());
    }

    private static String fullName(Person person) {
        return ((person.getFirstName() == null ? "" : person.getFirstName()) + " "
                + (person.getLastName() == null ? "" : person.getLastName())).trim();
    }

    private static String legacyPublicAbout(Event event) {
        return event.isAboutPrivate() ? null : event.getAbout();
    }

    private static String privateAbout(Event event, String username) {
        if (username == null) {
            return null;
        }
        String current = event.getPrivateDescriptions().entrySet().stream()
                .filter(entry -> entry.getKey() != null && entry.getKey().equalsIgnoreCase(username))
                .map(java.util.Map.Entry::getValue)
                .filter(EventResponse::hasText)
                .findFirst()
                .orElse(null);
        if (current != null) {
            return current;
        }
        if (event.isAboutPrivate()
                && event.getAboutOwnerUsername() != null
                && event.getAboutOwnerUsername().equalsIgnoreCase(username)) {
            return event.getAbout();
        }
        return null;
    }

    private static String combine(String publicAbout, String privateAbout) {
        if (hasText(publicAbout) && hasText(privateAbout)) {
            return publicAbout.trim() + "\n\n" + privateAbout.trim();
        }
        if (hasText(publicAbout)) {
            return publicAbout.trim();
        }
        return hasText(privateAbout) ? privateAbout.trim() : null;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
