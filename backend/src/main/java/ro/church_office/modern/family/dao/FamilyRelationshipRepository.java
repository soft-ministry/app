package ro.church_office.modern.family.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FamilyRelationshipRepository extends JpaRepository<FamilyRelationship, Long> {
    List<FamilyRelationship> findAllByFamilyId(Long familyId);

    Optional<FamilyRelationship> findByIdAndFamilyId(Long id, Long familyId);

    void deleteAllByFamilyId(Long familyId);
}
