package ro.church_office.modern.finance.controller;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ro.church_office.modern.finance.dto.FinanceOverviewResponse;
import ro.church_office.modern.finance.dto.TransactionRequest;
import ro.church_office.modern.finance.dto.TransactionResponse;
import ro.church_office.modern.finance.service.FinanceService;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {
    private final FinanceService financeService;

    public FinanceController(FinanceService financeService) {
        this.financeService = financeService;
    }

    @GetMapping
    public FinanceOverviewResponse overview(@RequestParam(value = "q", required = false) String query) {
        return financeService.overview(query);
    }

    @GetMapping("/transactions")
    public List<TransactionResponse> list(@RequestParam(value = "q", required = false) String query) {
        return financeService.list(query);
    }

    @GetMapping("/transactions/{id}")
    public TransactionResponse get(@PathVariable Long id) {
        return financeService.get(id);
    }

    @PostMapping("/transactions")
    public ResponseEntity<TransactionResponse> create(@Valid @RequestBody TransactionRequest request) {
        TransactionResponse response = financeService.create(request);
        return ResponseEntity.created(URI.create("/api/finance/transactions/" + response.id())).body(response);
    }

    @PutMapping("/transactions/{id}")
    public TransactionResponse update(@PathVariable Long id, @Valid @RequestBody TransactionRequest request) {
        return financeService.update(id, request);
    }

    @DeleteMapping("/transactions/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        financeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
