package ro.church_office.modern.finance.dto;

import java.math.BigDecimal;

public record FinanceSummaryResponse(
        BigDecimal currentBalance,
        BigDecimal totalIncome,
        BigDecimal totalExpenses,
        long transactionCount
) {
}
