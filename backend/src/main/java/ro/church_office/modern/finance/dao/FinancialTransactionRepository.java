package ro.church_office.modern.finance.dao;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FinancialTransactionRepository extends JpaRepository<FinancialTransaction, Long> {
    List<FinancialTransaction> findAllByChurchId(Long churchId, Sort sort);

    Optional<FinancialTransaction> findByIdAndChurchId(Long id, Long churchId);

    @Query("""
            select t from FinancialTransaction t
            where t.churchId = :churchId
              and (
                lower(t.name) like lower(concat('%', :q, '%'))
              )
            """)
    List<FinancialTransaction> search(@Param("churchId") Long churchId, @Param("q") String query, Sort sort);
}
