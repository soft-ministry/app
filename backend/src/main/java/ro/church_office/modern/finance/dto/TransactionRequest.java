package ro.church_office.modern.finance.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import ro.church_office.modern.finance.dao.TransactionType;

public record TransactionRequest(
        @NotNull TransactionType type,
        @NotBlank String name,
        String description,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        Boolean amountPrivate,
        LocalDate transactionDate
) {
}
