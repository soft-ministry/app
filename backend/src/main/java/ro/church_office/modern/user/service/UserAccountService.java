package ro.church_office.modern.user.service;

import java.util.List;

import ro.church_office.modern.common.ResourceNotFoundException;
import ro.church_office.modern.user.dao.UserAccount;
import ro.church_office.modern.user.dao.UserAccountRepository;
import ro.church_office.modern.user.dao.UserRole;
import ro.church_office.modern.user.dto.UserAccountRequest;
import ro.church_office.modern.user.dto.UserAccountResponse;

import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserAccountService {
    private static final String DEFAULT_ADMIN_USERNAME = "admin";

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public UserAccountService(UserAccountRepository userAccountRepository, PasswordEncoder passwordEncoder) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UserAccountResponse> list() {
        return userAccountRepository.findAll(Sort.by("username")).stream()
                .map(UserAccountResponse::from)
                .toList();
    }

    public UserAccountResponse get(Long id) {
        return UserAccountResponse.from(load(id));
    }

    public UserAccountResponse create(UserAccountRequest request) {
        String username = normalizeUsername(request.username());
        if (request.password() == null || request.password().isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (userAccountRepository.existsByUsernameIgnoreCase(username)) {
            throw new IllegalArgumentException("Username already exists");
        }
        UserAccount account = new UserAccount();
        account.setUsername(username);
        account.setPasswordHash(passwordEncoder.encode(request.password()));
        account.setRole(request.role() == null ? UserRole.USER : request.role());
        account.setEnabled(request.enabled() == null || request.enabled());
        return UserAccountResponse.from(userAccountRepository.save(account));
    }

    public UserAccountResponse update(Long id, UserAccountRequest request) {
        UserAccount account = load(id);
        boolean defaultAdmin = isDefaultAdmin(account);
        String username = defaultAdmin ? DEFAULT_ADMIN_USERNAME : normalizeUsername(request.username());
        userAccountRepository.findByUsernameIgnoreCase(username)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Username already exists");
                });
        account.setUsername(username);
        if (request.password() != null && !request.password().isBlank()) {
            account.setPasswordHash(passwordEncoder.encode(request.password()));
        }
        if (defaultAdmin) {
            account.setRole(UserRole.ADMIN);
            account.setEnabled(true);
        } else {
            account.setRole(request.role() == null ? UserRole.USER : request.role());
            account.setEnabled(request.enabled() == null || request.enabled());
        }
        return UserAccountResponse.from(userAccountRepository.save(account));
    }

    private UserAccount load(Long id) {
        return userAccountRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private String normalizeUsername(String username) {
        return username.trim().toLowerCase();
    }

    private boolean isDefaultAdmin(UserAccount account) {
        return DEFAULT_ADMIN_USERNAME.equalsIgnoreCase(account.getUsername());
    }
}
