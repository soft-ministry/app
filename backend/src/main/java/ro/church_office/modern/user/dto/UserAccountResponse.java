package ro.church_office.modern.user.dto;

import java.time.Instant;

import ro.church_office.modern.user.dao.UserAccount;
import ro.church_office.modern.user.dao.UserRole;

public record UserAccountResponse(
        Long id,
        String username,
        UserRole role,
        boolean enabled,
        Instant createdAt,
        Instant updatedAt
) {
    public static UserAccountResponse from(UserAccount account) {
        return new UserAccountResponse(
                account.getId(),
                account.getUsername(),
                account.getRole(),
                account.isEnabled(),
                account.getCreatedAt(),
                account.getUpdatedAt());
    }
}
