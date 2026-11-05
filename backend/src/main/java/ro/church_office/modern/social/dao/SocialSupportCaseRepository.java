package ro.church_office.modern.social.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SocialSupportCaseRepository extends JpaRepository<SocialSupportCase, Long> {
    List<SocialSupportCase> findAllByChurchId(Long churchId, Sort sort);

    Optional<SocialSupportCase> findByIdAndChurchId(Long id, Long churchId);

    @Query("""
            select c from SocialSupportCase c
            join c.person p
            left join c.assignedTo a
            where c.churchId = :churchId
              and (
                lower(c.summary) like lower(concat('%', :q, '%'))
                or lower(coalesce(c.privateNotes, '')) like lower(concat('%', :q, '%'))
                or lower(coalesce(p.firstName, '')) like lower(concat('%', :q, '%'))
                or lower(coalesce(p.lastName, '')) like lower(concat('%', :q, '%'))
                or lower(coalesce(a.firstName, '')) like lower(concat('%', :q, '%'))
                or lower(coalesce(a.lastName, '')) like lower(concat('%', :q, '%'))
              )
            """)
    List<SocialSupportCase> search(@Param("churchId") Long churchId, @Param("q") String query, Sort sort);
}
