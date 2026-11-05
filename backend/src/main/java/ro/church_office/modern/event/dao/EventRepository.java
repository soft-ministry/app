package ro.church_office.modern.event.dao;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findAllByChurchIdAndDeletedFalse(Long churchId, Sort sort);

    Optional<Event> findByIdAndChurchIdAndDeletedFalse(Long id, Long churchId);

    @Query("""
            select e from Event e
            where e.churchId = :churchId
              and e.deleted = false
              and (:fromDate is null or e.openDate >= :fromDate)
              and (:toDate is null or e.openDate <= :toDate)
              and (
                :q is null
                or lower(e.eventName) like lower(concat('%', :q, '%'))
              )
            """)
    List<Event> search(
            @Param("churchId") Long churchId,
            @Param("q") String query,
            @Param("fromDate") LocalDate fromDate,
            @Param("toDate") LocalDate toDate,
            Sort sort);
}
