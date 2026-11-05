package ro.church_office.modern.settings.dto;

import java.util.List;

public record ChurchSettingsResponse(
        Long id,
        String name,
        String avatarUrl,
        String pastorName,
        String denomination,
        String address,
        String treasurerName,
        String secretaryName,
        String contactPerson,
        boolean attendanceEnabled,
        List<ChurchSummaryResponse> churches) {
}
