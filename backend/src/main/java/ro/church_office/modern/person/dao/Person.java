package ro.church_office.modern.person.dao;

import java.time.LocalDate;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapKeyColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "persons")
public class Person {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long churchId = 1L;

    @Column(nullable = false)
    private String firstName;

    @Column(nullable = false)
    private String lastName;

    private String email;
    private String phone;
    private String address;
    private String churchRole;
    private String position;
    @Column(length = 3000)
    private String description;
    @Column(nullable = false)
    private boolean descriptionPrivate;
    private String descriptionOwnerUsername;

    @ElementCollection
    @CollectionTable(name = "person_private_descriptions", joinColumns = @JoinColumn(name = "person_id"))
    @MapKeyColumn(name = "username")
    @Column(name = "description", length = 3000)
    private Map<String, String> privateDescriptions = new LinkedHashMap<>();

    private LocalDate birthDate;

    @Enumerated(EnumType.STRING)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberType memberType = MemberType.MEMBER;

    @Column(nullable = false)
    private boolean active = true;

    @Enumerated(EnumType.STRING)
    private PersonStatus status = PersonStatus.ACTIVE;

    private LocalDate statusChangedDate;

    @Column(length = 3000)
    private String statusDetails;

    private String statusPhotoFileName;
    private String statusPhotoContentType;
    private Long statusPhotoFileSize;
    private String statusPhotoStoragePath;

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

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getChurchRole() {
        return churchRole;
    }

    public void setChurchRole(String churchRole) {
        this.churchRole = churchRole;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isDescriptionPrivate() {
        return descriptionPrivate;
    }

    public void setDescriptionPrivate(boolean descriptionPrivate) {
        this.descriptionPrivate = descriptionPrivate;
    }

    public String getDescriptionOwnerUsername() {
        return descriptionOwnerUsername;
    }

    public void setDescriptionOwnerUsername(String descriptionOwnerUsername) {
        this.descriptionOwnerUsername = descriptionOwnerUsername;
    }

    public Map<String, String> getPrivateDescriptions() {
        return privateDescriptions;
    }

    public void setPrivateDescriptions(Map<String, String> privateDescriptions) {
        this.privateDescriptions = privateDescriptions == null ? new LinkedHashMap<>() : privateDescriptions;
    }

    public LocalDate getBirthDate() {
        return birthDate;
    }

    public void setBirthDate(LocalDate birthDate) {
        this.birthDate = birthDate;
    }

    public Gender getGender() {
        return gender;
    }

    public void setGender(Gender gender) {
        this.gender = gender;
    }

    public MemberType getMemberType() {
        return memberType;
    }

    public void setMemberType(MemberType memberType) {
        this.memberType = memberType;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public PersonStatus getStatus() {
        return status;
    }

    public void setStatus(PersonStatus status) {
        this.status = status == null ? PersonStatus.ACTIVE : status;
    }

    public LocalDate getStatusChangedDate() {
        return statusChangedDate;
    }

    public void setStatusChangedDate(LocalDate statusChangedDate) {
        this.statusChangedDate = statusChangedDate;
    }

    public String getStatusDetails() {
        return statusDetails;
    }

    public void setStatusDetails(String statusDetails) {
        this.statusDetails = statusDetails;
    }

    public String getStatusPhotoFileName() {
        return statusPhotoFileName;
    }

    public void setStatusPhotoFileName(String statusPhotoFileName) {
        this.statusPhotoFileName = statusPhotoFileName;
    }

    public String getStatusPhotoContentType() {
        return statusPhotoContentType;
    }

    public void setStatusPhotoContentType(String statusPhotoContentType) {
        this.statusPhotoContentType = statusPhotoContentType;
    }

    public Long getStatusPhotoFileSize() {
        return statusPhotoFileSize;
    }

    public void setStatusPhotoFileSize(Long statusPhotoFileSize) {
        this.statusPhotoFileSize = statusPhotoFileSize;
    }

    public String getStatusPhotoStoragePath() {
        return statusPhotoStoragePath;
    }

    public void setStatusPhotoStoragePath(String statusPhotoStoragePath) {
        this.statusPhotoStoragePath = statusPhotoStoragePath;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }
}
