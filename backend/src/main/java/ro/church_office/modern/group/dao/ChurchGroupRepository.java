package ro.church_office.modern.group.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ChurchGroupRepository extends JpaRepository<ChurchGroup, Long> {
    List<ChurchGroup> findAllByChurchId(Long churchId, Sort sort);

    Optional<ChurchGroup> findByIdAndChurchId(Long id, Long churchId);

    @Query("""
            select g from ChurchGroup g
            where g.churchId = :churchId
              and (
                lower(g.name) like lower(concat('%', :q, '%'))
                or lower(coalesce(g.description, '')) like lower(concat('%', :q, '%'))
                or lower(coalesce(g.whatsappLink, '')) like lower(concat('%', :q, '%'))
              )
            """)
    List<ChurchGroup> search(@Param("churchId") Long churchId, @Param("q") String query, Sort sort);
}
