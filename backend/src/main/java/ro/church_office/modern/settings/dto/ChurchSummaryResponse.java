package ro.church_office.modern.settings.dto;

import ro.church_office.modern.church.dao.Church;

public record ChurchSummaryResponse(
        Long id,
        String name,
        String avatarUrl,
        String pastorName,
        String denomination,
        String address,
        String treasurerName,
        String secretaryName,
        String contactPerson) {

    public static ChurchSummaryResponse from(Church church) {
        return new ChurchSummaryResponse(
                church.getId(),
                church.getName(),
                church.getAvatarPath() == null || church.getAvatarPath().isBlank()
                        ? null
                        : "/api/settings/church/churches/" + church.getId() + "/avatar/content",
                church.getPastorName(),
                church.getDenomination(),
                church.getAddress(),
                church.getTreasurerName(),
                church.getSecretaryName(),
                church.getContactPerson());
    }
}
