package ro.church_office.modern.user.controller;

import java.net.URI;
import java.util.List;

import jakarta.validation.Valid;

import ro.church_office.modern.user.dto.UserAccountRequest;
import ro.church_office.modern.user.dto.UserAccountResponse;
import ro.church_office.modern.user.service.UserAccountService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserAccountController {
    private final UserAccountService userAccountService;

    public UserAccountController(UserAccountService userAccountService) {
        this.userAccountService = userAccountService;
    }

    @GetMapping
    public List<UserAccountResponse> list() {
        return userAccountService.list();
    }

    @GetMapping("/{id}")
    public UserAccountResponse get(@PathVariable Long id) {
        return userAccountService.get(id);
    }

    @PostMapping
    public ResponseEntity<UserAccountResponse> create(@Valid @RequestBody UserAccountRequest request) {
        UserAccountResponse response = userAccountService.create(request);
        return ResponseEntity.created(URI.create("/api/users/" + response.id())).body(response);
    }

    @PutMapping("/{id}")
    public UserAccountResponse update(@PathVariable Long id, @Valid @RequestBody UserAccountRequest request) {
        return userAccountService.update(id, request);
    }
}
