package ro.church_office.modern.finance.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import ro.church_office.modern.common.ResourceNotFoundException;
import ro.church_office.modern.finance.dao.FinancialTransaction;
import ro.church_office.modern.finance.dao.FinancialTransactionRepository;
import ro.church_office.modern.finance.dao.TransactionType;
import ro.church_office.modern.finance.dto.FinanceOverviewResponse;
import ro.church_office.modern.finance.dto.FinanceSummaryResponse;
import ro.church_office.modern.finance.dto.TransactionRequest;
import ro.church_office.modern.finance.dto.TransactionResponse;
import ro.church_office.modern.settings.service.ChurchSettingsService;

@Service
public class FinanceService {
    private final FinancialTransactionRepository transactionRepository;
    private final ChurchSettingsService churchSettingsService;

    public FinanceService(FinancialTransactionRepository transactionRepository,
            ChurchSettingsService churchSettingsService) {
        this.transactionRepository = transactionRepository;
        this.churchSettingsService = churchSettingsService;
    }

    @Transactional(readOnly = true)
    public FinanceOverviewResponse overview(String query) {
        List<FinancialTransaction> transactions = listEntities(query);
        String username = currentUsername();
        List<FinancialTransaction> visibleAmountTransactions = transactions.stream()
                .filter(transaction -> TransactionResponse.amountVisible(transaction, username))
                .toList();
        BigDecimal totalIncome = sum(visibleAmountTransactions, TransactionType.INCOME);
        BigDecimal totalExpenses = sum(visibleAmountTransactions, TransactionType.EXPENSE);
        FinanceSummaryResponse summary = new FinanceSummaryResponse(
                totalIncome.subtract(totalExpenses),
                totalIncome,
                totalExpenses,
                transactions.size()
        );
        return new FinanceOverviewResponse(summary, transactions.stream().map(transaction -> TransactionResponse.from(transaction, username)).toList());
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> list(String query) {
        String username = currentUsername();
        return listEntities(query).stream().map(transaction -> TransactionResponse.from(transaction, username)).toList();
    }

    @Transactional(readOnly = true)
    public TransactionResponse get(Long id) {
        return TransactionResponse.from(load(id), currentUsername());
    }

    @Transactional
    public TransactionResponse create(TransactionRequest request) {
        FinancialTransaction transaction = new FinancialTransaction();
        transaction.setChurchId(activeChurchId());
        apply(request, transaction);
        return TransactionResponse.from(transactionRepository.save(transaction), currentUsername());
    }

    @Transactional
    public TransactionResponse update(Long id, TransactionRequest request) {
        FinancialTransaction transaction = load(id);
        apply(request, transaction);
        return TransactionResponse.from(transactionRepository.save(transaction), currentUsername());
    }

    @Transactional
    public void delete(Long id) {
        transactionRepository.delete(load(id));
    }

    private List<FinancialTransaction> listEntities(String query) {
        Sort sort = Sort.by(Sort.Order.desc("transactionDate"), Sort.Order.desc("id"));
        Long churchId = activeChurchId();
        return query == null || query.isBlank()
                ? transactionRepository.findAllByChurchId(churchId, sort)
                : transactionRepository.search(churchId, query.trim(), sort);
    }

    private FinancialTransaction load(Long id) {
        return transactionRepository.findByIdAndChurchId(id, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found: " + id));
    }

    private void apply(TransactionRequest request, FinancialTransaction transaction) {
        String username = currentUsername();
        boolean preservePrivateAmount = transaction.isAmountPrivate()
                && !sameUser(transaction.getAmountOwnerUsername(), username);
        transaction.setType(request.type());
        transaction.setName(request.name().trim());
        transaction.setDescription(blankToNull(request.description()));
        if (!preservePrivateAmount) {
            transaction.setAmount(request.amount());
            boolean privateAmount = Boolean.TRUE.equals(request.amountPrivate());
            transaction.setAmountPrivate(privateAmount);
            if (privateAmount && transaction.getAmountOwnerUsername() == null) {
                transaction.setAmountOwnerUsername(username);
            }
            if (!privateAmount) {
                transaction.setAmountOwnerUsername(null);
            }
        }
        transaction.setTransactionDate(request.transactionDate() == null ? LocalDate.now() : request.transactionDate());
    }

    private BigDecimal sum(List<FinancialTransaction> transactions, TransactionType type) {
        return transactions.stream()
                .filter(transaction -> transaction.getType() == type)
                .map(FinancialTransaction::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private Long activeChurchId() {
        return churchSettingsService.activeChurchId();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String currentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            return null;
        }
        return authentication.getName();
    }

    private boolean sameUser(String owner, String username) {
        return owner != null && username != null && owner.equalsIgnoreCase(username);
    }
}
