package ro.church_office.modern.settings.dto;

import java.util.List;

public record TableColumnsResponse(
        String tableId,
        List<String> columns) {
}
