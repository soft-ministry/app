package ro.church_office.modern.family.dao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "family_members", uniqueConstraints = {
        @UniqueConstraint(name = "uk_family_member_person", columnNames = {"family_id", "person_id"})
})
public class FamilyMember {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "person_id", nullable = false)
    private Long personId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FamilyRole role = FamilyRole.OTHER;

    private boolean primaryMember;

    public Long getId() {
        return id;
    }

    public Long getFamilyId() {
        return familyId;
    }

    public void setFamilyId(Long familyId) {
        this.familyId = familyId;
    }

    public Long getPersonId() {
        return personId;
    }

    public void setPersonId(Long personId) {
        this.personId = personId;
    }

    public FamilyRole getRole() {
        return role;
    }

    public void setRole(FamilyRole role) {
        this.role = role;
    }

    public boolean isPrimaryMember() {
        return primaryMember;
    }

    public void setPrimaryMember(boolean primaryMember) {
        this.primaryMember = primaryMember;
    }
}
