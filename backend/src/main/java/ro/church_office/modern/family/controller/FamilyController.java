package ro.church_office.modern.family.controller;

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
import org.springframework.web.bind.annotation.RestController;

import ro.church_office.modern.family.dto.FamilyMemberRequest;
import ro.church_office.modern.family.dto.FamilyRelationshipRequest;
import ro.church_office.modern.family.dto.FamilyRequest;
import ro.church_office.modern.family.dto.FamilyResponse;
import ro.church_office.modern.family.service.FamilyService;

@RestController
@RequestMapping("/api/families")
public class FamilyController {
    private final FamilyService familyService;

    public FamilyController(FamilyService familyService) {
        this.familyService = familyService;
    }

    @GetMapping
    public List<FamilyResponse> list() {
        return familyService.list();
    }

    @GetMapping("/{id}")
    public FamilyResponse get(@PathVariable Long id) {
        return familyService.get(id);
    }

    @PostMapping
    public ResponseEntity<FamilyResponse> create(@Valid @RequestBody FamilyRequest request) {
        FamilyResponse response = familyService.create(request);
        return ResponseEntity.created(URI.create("/api/families/" + response.id())).body(response);
    }

    @PutMapping("/{id}")
    public FamilyResponse update(@PathVariable Long id, @Valid @RequestBody FamilyRequest request) {
        return familyService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        familyService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/members")
    public FamilyResponse addMember(@PathVariable Long id, @Valid @RequestBody FamilyMemberRequest request) {
        return familyService.addMember(id, request);
    }

    @PutMapping("/{id}/members/{memberId}")
    public FamilyResponse updateMember(@PathVariable Long id,
            @PathVariable Long memberId,
            @Valid @RequestBody FamilyMemberRequest request) {
        return familyService.updateMember(id, memberId, request);
    }

    @DeleteMapping("/{id}/members/{memberId}")
    public FamilyResponse removeMember(@PathVariable Long id, @PathVariable Long memberId) {
        return familyService.removeMember(id, memberId);
    }

    @PostMapping("/{id}/relationships")
    public FamilyResponse addRelationship(@PathVariable Long id, @Valid @RequestBody FamilyRelationshipRequest request) {
        return familyService.addRelationship(id, request);
    }

    @DeleteMapping("/{id}/relationships/{relationshipId}")
    public FamilyResponse deleteRelationship(@PathVariable Long id, @PathVariable Long relationshipId) {
        return familyService.deleteRelationship(id, relationshipId);
    }
}
