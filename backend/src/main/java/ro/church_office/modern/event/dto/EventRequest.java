package ro.church_office.modern.event.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonFormat;

import jakarta.validation.constraints.NotBlank;

import ro.church_office.modern.event.dao.EventStatus;
import ro.church_office.modern.event.dao.EventType;
import ro.church_office.modern.event.dao.Priority;
import ro.church_office.modern.event.dao.RecurrenceType;

public record EventRequest(
        @NotBlank String eventName,
        String about,
        Boolean aboutPrivate,
        String publicAbout,
        String privateAbout,
        LocalDate openDate,
        LocalDate endDate,
        @JsonFormat(pattern = "HH:mm")
        LocalTime eventTime,
        EventStatus status,
        EventType eventType,
        Priority priority,
        RecurrenceType recurrenceType,
        Long groupId,
        Long implementedById,
        Long contactedPersonId,
        List<Long> contactedPersonIds,
        List<Long> responsibleIds
) {
}
