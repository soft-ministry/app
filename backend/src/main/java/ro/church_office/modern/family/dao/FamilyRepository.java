package ro.church_office.modern.family.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FamilyRepository extends JpaRepository<Family, Long> {
    List<Family> findAllByChurchId(Long churchId, Sort sort);

    Optional<Family> findByIdAndChurchId(Long id, Long churchId);
}
