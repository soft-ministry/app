package ro.church_office.modern.settings.service;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import ro.church_office.modern.settings.dao.AppSetting;
import ro.church_office.modern.settings.dao.AppSettingRepository;
import ro.church_office.modern.settings.dto.TableColumnsResponse;
import ro.church_office.modern.settings.dto.TableLayoutResponse;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TablePreferenceService {
    private static final String COLUMNS_PREFIX = "table.columns.";
    private static final String VISIBLE_TABLES_KEY = "table.layout.visible";
    private static final String TABLE_ORDER_KEY = "table.layout.order";
    private static final String DEFAULT_PAGE_SIZE_KEY = "table.defaultPageSize";
    private static final Pattern TABLE_ID_PATTERN = Pattern.compile("[a-z][a-z0-9-]{0,60}");
    private static final Pattern COLUMN_PATTERN = Pattern.compile("[a-zA-Z][a-zA-Z0-9_]{0,60}");
    private static final int DEFAULT_PAGE_SIZE = 7;
    private static final int MIN_PAGE_SIZE = 1;
    private static final int MAX_PAGE_SIZE = 500;

    private final AppSettingRepository appSettingRepository;

    public TablePreferenceService(AppSettingRepository appSettingRepository) {
        this.appSettingRepository = appSettingRepository;
    }

    @Transactional(readOnly = true)
    public TableColumnsResponse getColumns(String tableId) {
        String normalizedTableId = normalizeTableId(tableId);
        List<String> columns = appSettingRepository.findById(settingKey(normalizedTableId))
                .map(setting -> parseColumns(setting.getValue()))
                .orElseGet(List::of);
        return new TableColumnsResponse(normalizedTableId, columns);
    }

    @Transactional
    public TableColumnsResponse updateColumns(String tableId, List<String> columns) {
        String normalizedTableId = normalizeTableId(tableId);
        List<String> normalizedColumns = normalizeColumns(columns);
        AppSetting setting = appSettingRepository.findById(settingKey(normalizedTableId))
                .orElseGet(() -> new AppSetting(settingKey(normalizedTableId), ""));
        setting.setValue(String.join(",", normalizedColumns));
        appSettingRepository.save(setting);
        return new TableColumnsResponse(normalizedTableId, normalizedColumns);
    }

    @Transactional(readOnly = true)
    public TableLayoutResponse getLayout() {
        List<String> visibleTables = appSettingRepository.findById(VISIBLE_TABLES_KEY)
                .map(setting -> parseTableIds(setting.getValue()))
                .orElseGet(List::of);
        List<String> tableOrder = appSettingRepository.findById(TABLE_ORDER_KEY)
                .map(setting -> parseTableIds(setting.getValue()))
                .orElseGet(List::of);
        int defaultPageSize = appSettingRepository.findById(DEFAULT_PAGE_SIZE_KEY)
                .map(setting -> parsePageSize(setting.getValue()))
                .orElse(DEFAULT_PAGE_SIZE);
        return new TableLayoutResponse(visibleTables, tableOrder, defaultPageSize);
    }

    @Transactional
    public TableLayoutResponse updateLayout(List<String> visibleTables, List<String> tableOrder, Integer defaultPageSize) {
        List<String> normalizedVisibleTables = normalizeTableIds(visibleTables, "Alege cel puțin un tabel.");
        List<String> normalizedTableOrder = normalizeTableIds(tableOrder, "Ordinea tabelelor este obligatorie.");
        for (String tableId : normalizedVisibleTables) {
            if (!normalizedTableOrder.contains(tableId)) {
                throw new IllegalArgumentException("Ordinea tabelelor trebuie să includă toate tabelele vizibile.");
            }
        }
        int normalizedPageSize = normalizePageSize(defaultPageSize);
        saveSetting(VISIBLE_TABLES_KEY, String.join(",", normalizedVisibleTables));
        saveSetting(TABLE_ORDER_KEY, String.join(",", normalizedTableOrder));
        saveSetting(DEFAULT_PAGE_SIZE_KEY, String.valueOf(normalizedPageSize));
        return new TableLayoutResponse(normalizedVisibleTables, normalizedTableOrder, normalizedPageSize);
    }

    private String normalizeTableId(String tableId) {
        String value = tableId == null ? "" : tableId.trim();
        if (!TABLE_ID_PATTERN.matcher(value).matches()) {
            throw new IllegalArgumentException("Identificatorul tabelului este invalid.");
        }
        return value;
    }

    private List<String> normalizeColumns(List<String> columns) {
        if (columns == null || columns.isEmpty()) {
            throw new IllegalArgumentException("Alege cel puțin o coloană.");
        }
        Set<String> unique = new LinkedHashSet<>();
        for (String column : columns) {
            String value = column == null ? "" : column.trim();
            if (!COLUMN_PATTERN.matcher(value).matches()) {
                throw new IllegalArgumentException("Lista de coloane conține valori invalide.");
            }
            unique.add(value);
        }
        return List.copyOf(unique);
    }

    private List<String> parseColumns(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        List<String> columns = new ArrayList<>();
        for (String column : value.split(",")) {
            String trimmed = column.trim();
            if (COLUMN_PATTERN.matcher(trimmed).matches() && !columns.contains(trimmed)) {
                columns.add(trimmed);
            }
        }
        return columns;
    }

    private List<String> parseTableIds(String value) {
        if (value == null || value.isBlank()) {
            return List.of();
        }
        List<String> tableIds = new ArrayList<>();
        for (String tableId : value.split(",")) {
            String trimmed = tableId.trim();
            if (TABLE_ID_PATTERN.matcher(trimmed).matches() && !tableIds.contains(trimmed)) {
                tableIds.add(trimmed);
            }
        }
        return tableIds;
    }

    private List<String> normalizeTableIds(List<String> tableIds, String emptyMessage) {
        if (tableIds == null || tableIds.isEmpty()) {
            throw new IllegalArgumentException(emptyMessage);
        }
        Set<String> unique = new LinkedHashSet<>();
        for (String tableId : tableIds) {
            unique.add(normalizeTableId(tableId));
        }
        return List.copyOf(unique);
    }

    private int normalizePageSize(Integer pageSize) {
        if (pageSize == null) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, pageSize));
    }

    private int parsePageSize(String value) {
        try {
            return normalizePageSize(Integer.valueOf(value));
        } catch (NumberFormatException ex) {
            return DEFAULT_PAGE_SIZE;
        }
    }

    private void saveSetting(String key, String value) {
        AppSetting setting = appSettingRepository.findById(key)
                .orElseGet(() -> new AppSetting(key, ""));
        setting.setValue(value);
        appSettingRepository.save(setting);
    }

    private String settingKey(String tableId) {
        return COLUMNS_PREFIX + tableId;
    }
}
