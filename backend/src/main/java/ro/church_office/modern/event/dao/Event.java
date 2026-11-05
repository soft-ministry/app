package ro.church_office.modern.event.dao;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinTable;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import ro.church_office.modern.group.dao.ChurchGroup;
import ro.church_office.modern.person.dao.Person;

@Entity
@Table(name = "events")
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long churchId = 1L;

    @Column(nullable = false)
    private String eventName;

    @Column(length = 3000)
    private String about;
    @Column(nullable = false)
    private boolean aboutPrivate;
    private String aboutOwnerUsername;

    @ElementCollection
    @CollectionTable(name = "event_private_descriptions", joinColumns = @JoinColumn(name = "event_id"))
    @MapKeyColumn(name = "username")
    @Column(name = "description", length = 3000)
    private Map<String, String> privateDescriptions = new LinkedHashMap<>();

    private LocalDate openDate;
    private LocalDate endDate;
    private LocalTime eventTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventStatus status = EventStatus.PLANNED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EventType eventType = EventType.OTHER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority = Priority.MEDIUM;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RecurrenceType recurrenceType = RecurrenceType.NONE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private ChurchGroup associatedGroup;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "implemented_by_id")
    private Person implementedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "contacted_person_id")
    private Person contactedPerson;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "event_contacted_persons",
            joinColumns = @JoinColumn(name = "event_id"),
            inverseJoinColumns = @JoinColumn(name = "person_id"))
    private Set<Person> contactedPersons = new LinkedHashSet<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "event_responsibles",
            joinColumns = @JoinColumn(name = "event_id"),
            inverseJoinColumns = @JoinColumn(name = "person_id"))
    private Set<Person> responsiblePersons = new LinkedHashSet<>();

    @Column(nullable = false)
    private boolean deleted;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    @PrePersist
    void prePersist() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void preUpdate() {
        updatedAt = Instant.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getChurchId() {
        return churchId;
    }

    public void setChurchId(Long churchId) {
        this.churchId = churchId;
    }

    public String getEventName() {
        return eventName;
    }

    public void setEventName(String eventName) {
        this.eventName = eventName;
    }

    public String getAbout() {
        return about;
    }

    public void setAbout(String about) {
        this.about = about;
    }

    public boolean isAboutPrivate() {
        return aboutPrivate;
    }

    public void setAboutPrivate(boolean aboutPrivate) {
        this.aboutPrivate = aboutPrivate;
    }

    public String getAboutOwnerUsername() {
        return aboutOwnerUsername;
    }

    public void setAboutOwnerUsername(String aboutOwnerUsername) {
        this.aboutOwnerUsername = aboutOwnerUsername;
    }

    public Map<String, String> getPrivateDescriptions() {
        return privateDescriptions;
    }

    public void setPrivateDescriptions(Map<String, String> privateDescriptions) {
        this.privateDescriptions = privateDescriptions == null ? new LinkedHashMap<>() : privateDescriptions;
    }

    public LocalDate getOpenDate() {
        return openDate;
    }

    public void setOpenDate(LocalDate openDate) {
        this.openDate = openDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public LocalTime getEventTime() {
        return eventTime;
    }

    public void setEventTime(LocalTime eventTime) {
        this.eventTime = eventTime;
    }

    public EventStatus getStatus() {
        return status;
    }

    public void setStatus(EventStatus status) {
        this.status = status;
    }

    public EventType getEventType() {
        return eventType;
    }

    public void setEventType(EventType eventType) {
        this.eventType = eventType;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public RecurrenceType getRecurrenceType() {
        return recurrenceType;
    }

    public void setRecurrenceType(RecurrenceType recurrenceType) {
        this.recurrenceType = recurrenceType;
    }

    public ChurchGroup getAssociatedGroup() {
        return associatedGroup;
    }

    public void setAssociatedGroup(ChurchGroup associatedGroup) {
        this.associatedGroup = associatedGroup;
    }

    public Person getImplementedBy() {
        return implementedBy;
    }

    public void setImplementedBy(Person implementedBy) {
        this.implementedBy = implementedBy;
    }

    public Person getContactedPerson() {
        return contactedPerson;
    }

    public void setContactedPerson(Person contactedPerson) {
        this.contactedPerson = contactedPerson;
    }

    public Set<Person> getContactedPersons() {
        return contactedPersons;
    }

    public void setContactedPersons(Set<Person> contactedPersons) {
        this.contactedPersons = contactedPersons == null ? new LinkedHashSet<>() : contactedPersons;
    }

    public Set<Person> getResponsiblePersons() {
        return responsiblePersons;
    }

    public void setResponsiblePersons(Set<Person> responsiblePersons) {
        this.responsiblePersons = responsiblePersons == null ? new LinkedHashSet<>() : responsiblePersons;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
