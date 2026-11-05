package ro.church_office.modern.event.service;

import java.time.LocalDate;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ro.church_office.modern.common.ResourceNotFoundException;
import ro.church_office.modern.event.dao.Event;
import ro.church_office.modern.event.dao.EventRepository;
import ro.church_office.modern.event.dao.EventStatus;
import ro.church_office.modern.event.dao.EventType;
import ro.church_office.modern.event.dao.Priority;
import ro.church_office.modern.event.dao.RecurrenceType;
import ro.church_office.modern.event.dto.EventRequest;
import ro.church_office.modern.event.dto.EventResponse;
import ro.church_office.modern.group.dao.ChurchGroup;
import ro.church_office.modern.group.dao.ChurchGroupRepository;
import ro.church_office.modern.person.dao.Person;
import ro.church_office.modern.person.dao.PersonRepository;
import ro.church_office.modern.settings.service.ChurchSettingsService;

@Service
public class EventService {
    private final EventRepository eventRepository;
    private final ChurchGroupRepository groupRepository;
    private final PersonRepository personRepository;
    private final ChurchSettingsService churchSettingsService;

    public EventService(
            EventRepository eventRepository,
            ChurchGroupRepository groupRepository,
            PersonRepository personRepository,
            ChurchSettingsService churchSettingsService) {
        this.eventRepository = eventRepository;
        this.groupRepository = groupRepository;
        this.personRepository = personRepository;
        this.churchSettingsService = churchSettingsService;
    }

    @Transactional(readOnly = true)
    public List<EventResponse> list(String query, LocalDate fromDate, LocalDate toDate) {
        Sort sort = Sort.by(Sort.Order.asc("openDate"), Sort.Order.asc("eventTime"), Sort.Order.asc("eventName"));
        String normalizedQuery = query == null || query.isBlank() ? null : query.trim();
        String username = currentUsername();
        return eventRepository.search(activeChurchId(), normalizedQuery, fromDate, toDate, sort).stream()
                .map(event -> EventResponse.from(event, username))
                .toList();
    }

    @Transactional(readOnly = true)
    public EventResponse get(Long id) {
        return EventResponse.from(load(id), currentUsername());
    }

    @Transactional
    public EventResponse create(EventRequest request) {
        Event event = new Event();
        event.setChurchId(activeChurchId());
        apply(request, event);
        return EventResponse.from(eventRepository.save(event), currentUsername());
    }

    @Transactional
    public EventResponse update(Long id, EventRequest request) {
        Event event = load(id);
        apply(request, event);
        return EventResponse.from(eventRepository.save(event), currentUsername());
    }

    @Transactional
    public void delete(Long id) {
        Event event = load(id);
        event.setDeleted(true);
        eventRepository.save(event);
    }

    private Event load(Long id) {
        return eventRepository.findByIdAndChurchIdAndDeletedFalse(id, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + id));
    }

    private void apply(EventRequest request, Event event) {
        validateDates(request.openDate(), request.endDate());
        String username = currentUsername();
        event.setEventName(request.eventName().trim());
        applyDescriptions(request, event, username);
        event.setOpenDate(request.openDate());
        event.setEndDate(request.endDate());
        event.setEventTime(request.eventTime());
        event.setStatus(request.status() == null ? EventStatus.PLANNED : request.status());
        event.setEventType(request.eventType() == null ? EventType.OTHER : request.eventType());
        event.setPriority(request.priority() == null ? Priority.MEDIUM : request.priority());
        event.setRecurrenceType(request.recurrenceType() == null ? RecurrenceType.NONE : request.recurrenceType());
        event.setAssociatedGroup(request.groupId() == null ? null : loadGroup(request.groupId()));
        Set<Person> responsiblePersons = loadResponsiblePersons(request);
        event.setResponsiblePersons(responsiblePersons);
        event.setImplementedBy(responsiblePersons.stream().findFirst().orElse(null));
        Set<Person> contactedPersons = loadContactedPersons(request);
        event.setContactedPersons(contactedPersons);
        event.setContactedPerson(contactedPersons.stream().findFirst().orElse(null));
    }

    private void applyDescriptions(EventRequest request, Event event, String username) {
        String publicAbout = request.publicAbout();
        String privateAbout = request.privateAbout();

        if (publicAbout == null && privateAbout == null) {
            if (Boolean.TRUE.equals(request.aboutPrivate())) {
                privateAbout = request.about();
            } else {
                publicAbout = request.about();
            }
        }

        event.setAbout(blankToNull(publicAbout));
        event.setAboutPrivate(false);
        event.setAboutOwnerUsername(null);

        if (username == null) {
            return;
        }
        String normalizedPrivateAbout = blankToNull(privateAbout);
        if (normalizedPrivateAbout == null) {
            event.getPrivateDescriptions().remove(username);
        } else {
            event.getPrivateDescriptions().put(username, normalizedPrivateAbout);
        }
    }

    private void validateDates(LocalDate openDate, LocalDate endDate) {
        if (openDate != null && endDate != null && endDate.isBefore(openDate)) {
            throw new IllegalArgumentException("End date cannot be before start date");
        }
    }

    private ChurchGroup loadGroup(Long id) {
        return groupRepository.findByIdAndChurchId(id, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Group not found: " + id));
    }

    private Person loadPerson(Long id) {
        return personRepository.findByIdAndChurchId(id, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Person not found: " + id));
    }

    private Set<Person> loadResponsiblePersons(EventRequest request) {
        List<Long> ids = request.responsibleIds();
        if (ids == null && request.implementedById() != null) {
            ids = List.of(request.implementedById());
        }
        if (ids == null || ids.isEmpty()) {
            return new LinkedHashSet<>();
        }
        Set<Person> people = new LinkedHashSet<>();
        ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .map(this::loadPerson)
                .forEach(people::add);
        return people;
    }

    private Set<Person> loadContactedPersons(EventRequest request) {
        List<Long> ids = request.contactedPersonIds();
        if ((ids == null || ids.isEmpty()) && request.contactedPersonId() != null) {
            ids = List.of(request.contactedPersonId());
        }
        if (ids == null || ids.isEmpty()) {
            return new LinkedHashSet<>();
        }
        Set<Person> people = new LinkedHashSet<>();
        ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .map(this::loadPerson)
                .forEach(people::add);
        return people;
    }

    private Long activeChurchId() {
        return churchSettingsService.activeChurchId();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return null;
        }
        return authentication.getName();
    }

}
