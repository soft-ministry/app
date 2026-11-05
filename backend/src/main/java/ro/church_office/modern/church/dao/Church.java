package ro.church_office.modern.church.dao;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "churches")
public class Church {
    @Id
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 1200)
    private String avatarPath;

    @Column(length = 160)
    private String pastorName;

    @Column(length = 160)
    private String denomination;

    @Column(length = 600)
    private String address;

    @Column(length = 160)
    private String treasurerName;

    @Column(length = 160)
    private String secretaryName;

    @Column(length = 160)
    private String contactPerson;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    protected Church() {
    }

    public Church(Long id, String name) {
        this.id = id;
        this.name = name;
    }

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAvatarPath() {
        return avatarPath;
    }

    public void setAvatarPath(String avatarPath) {
        this.avatarPath = avatarPath;
    }

    public String getPastorName() {
        return pastorName;
    }

    public void setPastorName(String pastorName) {
        this.pastorName = pastorName;
    }

    public String getDenomination() {
        return denomination;
    }

    public void setDenomination(String denomination) {
        this.denomination = denomination;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getTreasurerName() {
        return treasurerName;
    }

    public void setTreasurerName(String treasurerName) {
        this.treasurerName = treasurerName;
    }

    public String getSecretaryName() {
        return secretaryName;
    }

    public void setSecretaryName(String secretaryName) {
        this.secretaryName = secretaryName;
    }

    public String getContactPerson() {
        return contactPerson;
    }

    public void setContactPerson(String contactPerson) {
        this.contactPerson = contactPerson;
    }
}
