package ro.church_office.modern.church.dao;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ChurchRepository extends JpaRepository<Church, Long> {
    List<Church> findAllByOrderByNameAsc();

    @Query("select coalesce(max(c.id), 0) from Church c")
    Long maxId();
}
