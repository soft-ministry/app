package ro.church_office.modern.finance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import ro.church_office.modern.finance.dao.FinancialTransaction;
import ro.church_office.modern.finance.dao.TransactionType;

public record TransactionResponse(
        Long id,
        TransactionType type,
        String name,
        String description,
        BigDecimal amount,
        boolean amountPrivate,
        boolean amountVisible,
        LocalDate transactionDate
) {
    public static TransactionResponse from(FinancialTransaction transaction, String username) {
        boolean amountVisible = amountVisible(transaction, username);
        return new TransactionResponse(
                transaction.getId(),
                transaction.getType(),
                transaction.getName(),
                transaction.getDescription(),
                amountVisible ? transaction.getAmount() : null,
                transaction.isAmountPrivate(),
                amountVisible,
                transaction.getTransactionDate()
        );
    }

    public static boolean amountVisible(FinancialTransaction transaction, String username) {
        return !transaction.isAmountPrivate()
                || (transaction.getAmountOwnerUsername() != null
                && username != null
                && transaction.getAmountOwnerUsername().equalsIgnoreCase(username));
    }
}
