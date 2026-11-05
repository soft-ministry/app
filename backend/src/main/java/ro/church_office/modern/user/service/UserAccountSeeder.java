package ro.church_office.modern.user.service;

import ro.church_office.modern.user.dao.UserAccount;
import ro.church_office.modern.user.dao.UserAccountRepository;
import ro.church_office.modern.user.dao.UserRole;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class UserAccountSeeder implements CommandLineRunner {
    private static final String DEFAULT_ADMIN_USERNAME = "admin";
    private static final String DEFAULT_ADMIN_PASSWORD = "admin123";

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;

    public UserAccountSeeder(UserAccountRepository userAccountRepository, PasswordEncoder passwordEncoder) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        ensureDefaultAdmin();
        createIfMissing("user", "user123", UserRole.USER);
    }

    private void ensureDefaultAdmin() {
        userAccountRepository.findByUsernameIgnoreCase(DEFAULT_ADMIN_USERNAME)
                .ifPresentOrElse(account -> {
                    boolean changed = false;
                    if (account.getRole() != UserRole.ADMIN) {
                        account.setRole(UserRole.ADMIN);
                        changed = true;
                    }
                    if (!account.isEnabled()) {
                        account.setEnabled(true);
                        changed = true;
                    }
                    if (changed) {
                        userAccountRepository.save(account);
                    }
                }, () -> createIfMissing(DEFAULT_ADMIN_USERNAME, DEFAULT_ADMIN_PASSWORD, UserRole.ADMIN));
    }

    private void createIfMissing(String username, String password, UserRole role) {
        if (userAccountRepository.existsByUsernameIgnoreCase(username)) {
            return;
        }
        UserAccount account = new UserAccount();
        account.setUsername(username);
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setRole(role);
        account.setEnabled(true);
        userAccountRepository.save(account);
    }
}
