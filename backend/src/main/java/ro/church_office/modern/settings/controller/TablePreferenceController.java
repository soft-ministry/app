package ro.church_office.modern.settings.controller;

import jakarta.validation.Valid;

import ro.church_office.modern.settings.dto.TableColumnsRequest;
import ro.church_office.modern.settings.dto.TableColumnsResponse;
import ro.church_office.modern.settings.dto.TableLayoutRequest;
import ro.church_office.modern.settings.dto.TableLayoutResponse;
import ro.church_office.modern.settings.service.TablePreferenceService;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/table-preferences")
public class TablePreferenceController {
    private final TablePreferenceService tablePreferenceService;

    public TablePreferenceController(TablePreferenceService tablePreferenceService) {
        this.tablePreferenceService = tablePreferenceService;
    }

    @GetMapping("/{tableId}/columns")
    public TableColumnsResponse getColumns(@PathVariable String tableId) {
        return tablePreferenceService.getColumns(tableId);
    }

    @PutMapping("/{tableId}/columns")
    public TableColumnsResponse updateColumns(@PathVariable String tableId, @Valid @RequestBody TableColumnsRequest request) {
        return tablePreferenceService.updateColumns(tableId, request.columns());
    }

    @GetMapping("/layout")
    public TableLayoutResponse getLayout() {
        return tablePreferenceService.getLayout();
    }

    @PutMapping("/layout")
    public TableLayoutResponse updateLayout(@Valid @RequestBody TableLayoutRequest request) {
        return tablePreferenceService.updateLayout(request.visibleTables(), request.tableOrder(), request.defaultPageSize());
    }
}
