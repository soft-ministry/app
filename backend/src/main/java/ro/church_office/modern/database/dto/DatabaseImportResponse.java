package ro.church_office.modern.database.dto;

public record DatabaseImportResponse(
        String message,
        String backupPath,
        boolean restartRequired) {
}
