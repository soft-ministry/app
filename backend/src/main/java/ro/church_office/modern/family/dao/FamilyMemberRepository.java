package ro.church_office.modern.family.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {
    List<FamilyMember> findAllByFamilyId(Long familyId);

    Optional<FamilyMember> findByIdAndFamilyId(Long id, Long familyId);

    boolean existsByFamilyIdAndPersonId(Long familyId, Long personId);

    void deleteAllByFamilyId(Long familyId);

    void deleteAllByFamilyIdAndPersonId(Long familyId, Long personId);
}
