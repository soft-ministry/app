package ro.church_office.modern.social.controller;

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

import ro.church_office.modern.social.dto.SocialSupportCaseRequest;
import ro.church_office.modern.social.dto.SocialSupportCaseResponse;
import ro.church_office.modern.social.service.SocialSupportCaseService;

@RestController
@RequestMapping("/api/social-support")
public class SocialSupportCaseController {
    private final SocialSupportCaseService caseService;

    public SocialSupportCaseController(SocialSupportCaseService caseService) {
        this.caseService = caseService;
    }

    @GetMapping
    public List<SocialSupportCaseResponse> list(@RequestParam(value = "q", required = false) String query) {
        return caseService.list(query);
    }

    @GetMapping("/{id}")
    public SocialSupportCaseResponse get(@PathVariable Long id) {
        return caseService.get(id);
    }

    @PostMapping
    public ResponseEntity<SocialSupportCaseResponse> create(@Valid @RequestBody SocialSupportCaseRequest request) {
        SocialSupportCaseResponse response = caseService.create(request);
        return ResponseEntity.created(URI.create("/api/social-support/" + response.id())).body(response);
    }

    @PutMapping("/{id}")
    public SocialSupportCaseResponse update(@PathVariable Long id,
            @Valid @RequestBody SocialSupportCaseRequest request) {
        return caseService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        caseService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
