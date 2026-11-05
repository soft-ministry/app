package ro.church_office.modern.settings.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChurchSettingsRequest(
        @NotBlank
        @Size(max = 120)
        String name,
        @Size(max = 160)
        String pastorName,
        @Size(max = 160)
        String denomination,
        @Size(max = 600)
        String address,
        @Size(max = 160)
        String treasurerName,
        @Size(max = 160)
        String secretaryName,
        @Size(max = 160)
        String contactPerson,
        Boolean attendanceEnabled) {
}
