package ro.church_office.modern.family.dao;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "family_relationships")
public class FamilyRelationship {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "person_a_id", nullable = false)
    private Long personAId;

    @Column(name = "person_b_id", nullable = false)
    private Long personBId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FamilyRelationshipType type;

    public Long getId() {
        return id;
    }

    public Long getFamilyId() {
        return familyId;
    }

    public void setFamilyId(Long familyId) {
        this.familyId = familyId;
    }

    public Long getPersonAId() {
        return personAId;
    }

    public void setPersonAId(Long personAId) {
        this.personAId = personAId;
    }

    public Long getPersonBId() {
        return personBId;
    }

    public void setPersonBId(Long personBId) {
        this.personBId = personBId;
    }

    public FamilyRelationshipType getType() {
        return type;
    }

    public void setType(FamilyRelationshipType type) {
        this.type = type;
    }
}
