package ro.church_office.modern.finance.dto;

import java.util.List;

public record FinanceOverviewResponse(
        FinanceSummaryResponse summary,
        List<TransactionResponse> transactions
) {
}
