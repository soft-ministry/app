package ro.church_office.modern.settings.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;

public record TableColumnsRequest(
        @NotEmpty List<String> columns) {
}
