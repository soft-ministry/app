package ro.church_office.modern.auth.dto;

import java.util.List;

public record LoginResponse(
        String accessToken,
        String tokenType,
        long expiresInSeconds,
        String username,
        List<String> roles
) {
}
