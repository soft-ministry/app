package ro.church_office.modern.settings.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

public record TableLayoutRequest(
        @NotEmpty List<String> visibleTables,
        @NotEmpty List<String> tableOrder,
        @NotNull Integer defaultPageSize) {
}
