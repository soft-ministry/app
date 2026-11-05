package ro.church_office.modern.family.dto;

import jakarta.validation.constraints.NotBlank;

public record FamilyRequest(
        @NotBlank String name,
        String notes
) {
}
