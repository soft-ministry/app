package ro.church_office.modern.settings.dto;

import java.util.List;

public record TableLayoutResponse(
        List<String> visibleTables,
        List<String> tableOrder,
        int defaultPageSize) {
}
