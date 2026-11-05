package ro.church_office.modern.user.dto;

import jakarta.validation.constraints.NotBlank;

import ro.church_office.modern.user.dao.UserRole;

public record UserAccountRequest(
        @NotBlank String username,
        String password,
        UserRole role,
        Boolean enabled
) {
}
