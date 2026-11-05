package ro.church_office.modern.person.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PersonRepository extends JpaRepository<Person, Long> {
    List<Person> findAllByChurchId(Long churchId, Sort sort);

    Optional<Person> findByIdAndChurchId(Long id, Long churchId);

    @Query("""
            select p from Person p
            where p.churchId = :churchId
              and (
                lower(p.firstName) like lower(concat('%', :q, '%'))
                or lower(p.lastName) like lower(concat('%', :q, '%'))
                or lower(coalesce(p.email, '')) like lower(concat('%', :q, '%'))
              )
            """)
    List<Person> search(@Param("churchId") Long churchId, @Param("q") String query, Sort sort);
}

