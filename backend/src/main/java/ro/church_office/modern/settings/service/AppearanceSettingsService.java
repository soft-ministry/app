package ro.church_office.modern.settings.service;

import java.util.LinkedHashMap;
import java.util.Map;

import ro.church_office.modern.settings.dao.AppSetting;
import ro.church_office.modern.settings.dao.AppSettingRepository;
import ro.church_office.modern.settings.dto.AppearanceSettingsRequest;
import ro.church_office.modern.settings.dto.AppearanceSettingsResponse;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppearanceSettingsService {
    private static final String PREFIX = "appearance.";
    private static final Map<String, String> DEFAULTS = new LinkedHashMap<>();

    static {
        DEFAULTS.put("backgroundStart", "#eaf1fb");
        DEFAULTS.put("backgroundMiddle", "#dce8f4");
        DEFAULTS.put("backgroundEnd", "#eef2f7");
        DEFAULTS.put("surface", "#ffffff");
        DEFAULTS.put("surfaceMuted", "#f8fafc");
        DEFAULTS.put("border", "#d5d7df");
        DEFAULTS.put("text", "#111827");
        DEFAULTS.put("muted", "#6b7280");
        DEFAULTS.put("primary", "#2563eb");
        DEFAULTS.put("primaryStrong", "#1d4ed8");
        DEFAULTS.put("primarySoft", "#eef4ff");
        DEFAULTS.put("accent", "#d97706");
        DEFAULTS.put("info", "#0891b2");
        DEFAULTS.put("danger", "#b91c1c");
        DEFAULTS.put("toolbarBackground", "#ffffff");
        DEFAULTS.put("tableHeaderStart", "#eef4ff");
        DEFAULTS.put("tableHeaderEnd", "#e8f0fd");
        DEFAULTS.put("tableNameColor", "#374151");
        DEFAULTS.put("tableBodyColor", "#374151");
        DEFAULTS.put("tableNameFontFamily", "inter");
        DEFAULTS.put("tableBodyFontFamily", "inter");
        DEFAULTS.put("tableHeaderFontSize", "13");
        DEFAULTS.put("tableNameFontSize", "15");
        DEFAULTS.put("tableBodyFontSize", "14.5");
        DEFAULTS.put("tablePriorityDisplay", "label");
        DEFAULTS.put("calendarEventColor", "#1f2937");
        DEFAULTS.put("calendarEventFontFamily", "inter");
        DEFAULTS.put("calendarEventFontSize", "13.5");
        DEFAULTS.put("calendarEventBold", "false");
        DEFAULTS.put("calendarEventItalic", "false");
        DEFAULTS.put("calendarLayout", "large");
        DEFAULTS.put("calendarBirthdaysEnabled", "false");
        DEFAULTS.put("birthdayNotificationsEnabled", "false");
        DEFAULTS.put("birthdayNotificationDaysBefore", "7");
        DEFAULTS.put("eventStatusPlannedColor", "#2563eb");
        DEFAULTS.put("eventStatusActiveColor", "#16a34a");
        DEFAULTS.put("eventStatusDoneColor", "#94a3b8");
        DEFAULTS.put("eventStatusCanceledColor", "#b91c1c");
        DEFAULTS.put("calendarEventColorMode", "status");
        DEFAULTS.put("eventTypeOtherColor", "#64748b");
        DEFAULTS.put("eventTypeServiceColor", "#2563eb");
        DEFAULTS.put("eventTypeMeetingColor", "#16a34a");
        DEFAULTS.put("eventTypeEventColor", "#7c3aed");
        DEFAULTS.put("eventTypeStudyColor", "#d97706");
        DEFAULTS.put("eventTypeActDeCultColor", "#9333ea");
        DEFAULTS.put("eventTypeEvangelismColor", "#ea580c");
        DEFAULTS.put("eventTypeFellowshipColor", "#0d9488");
        DEFAULTS.put("eventTypeFuneralColor", "#475569");
        DEFAULTS.put("eventTypeItColor", "#0284c7");
        DEFAULTS.put("eventTypeMusicColor", "#db2777");
        DEFAULTS.put("eventTypeAdministrationColor", "#4f46e5");
        DEFAULTS.put("eventTypeMaintenanceColor", "#0f766e");
        DEFAULTS.put("eventTypeSocialMediaPublishingColor", "#be185d");
        DEFAULTS.put("eventTypeRenovationColor", "#b45309");
        DEFAULTS.put("priorityLowColor", "#e5e7eb");
        DEFAULTS.put("priorityMediumLowColor", "#cbd5e1");
        DEFAULTS.put("priorityMediumColor", "#94a3b8");
        DEFAULTS.put("priorityHighMediumColor", "#d97706");
        DEFAULTS.put("priorityHighColor", "#b91c1c");
        DEFAULTS.put("searchIgnoreDiacritics", "true");
    }

    private final AppSettingRepository appSettingRepository;

    public AppearanceSettingsService(AppSettingRepository appSettingRepository) {
        this.appSettingRepository = appSettingRepository;
    }

    @Transactional(readOnly = true)
    public AppearanceSettingsResponse get() {
        Map<String, String> values = new LinkedHashMap<>(DEFAULTS);
        appSettingRepository.findAllById(DEFAULTS.keySet().stream().map(key -> PREFIX + key).toList())
                .forEach(setting -> values.put(setting.getKey().substring(PREFIX.length()), setting.getValue()));
        return response(values);
    }

    @Transactional
    public AppearanceSettingsResponse update(AppearanceSettingsRequest request) {
        Map<String, String> values = new LinkedHashMap<>(DEFAULTS);
        putIfPresent(values, "backgroundStart", request.backgroundStart());
        putIfPresent(values, "backgroundMiddle", request.backgroundMiddle());
        putIfPresent(values, "backgroundEnd", request.backgroundEnd());
        putIfPresent(values, "surface", request.surface());
        putIfPresent(values, "surfaceMuted", request.surfaceMuted());
        putIfPresent(values, "border", request.border());
        putIfPresent(values, "text", request.text());
        putIfPresent(values, "muted", request.muted());
        putIfPresent(values, "primary", request.primary());
        putIfPresent(values, "primaryStrong", request.primaryStrong());
        putIfPresent(values, "primarySoft", request.primarySoft());
        putIfPresent(values, "accent", request.accent());
        putIfPresent(values, "info", request.info());
        putIfPresent(values, "danger", request.danger());
        putIfPresent(values, "toolbarBackground", request.toolbarBackground());
        putIfPresent(values, "tableHeaderStart", request.tableHeaderStart());
        putIfPresent(values, "tableHeaderEnd", request.tableHeaderEnd());
        putIfPresent(values, "tableNameColor", request.tableNameColor());
        putIfPresent(values, "tableBodyColor", request.tableBodyColor());
        putIfPresent(values, "tableNameFontFamily", request.tableNameFontFamily());
        putIfPresent(values, "tableBodyFontFamily", request.tableBodyFontFamily());
        putIfPresent(values, "tableHeaderFontSize", request.tableHeaderFontSize());
        putIfPresent(values, "tableNameFontSize", request.tableNameFontSize());
        putIfPresent(values, "tableBodyFontSize", request.tableBodyFontSize());
        putIfPresent(values, "tablePriorityDisplay", request.tablePriorityDisplay());
        putIfPresent(values, "calendarEventColor", request.calendarEventColor());
        putIfPresent(values, "calendarEventFontFamily", request.calendarEventFontFamily());
        putIfPresent(values, "calendarEventFontSize", request.calendarEventFontSize());
        putIfPresent(values, "calendarEventBold", request.calendarEventBold());
        putIfPresent(values, "calendarEventItalic", request.calendarEventItalic());
        putIfPresent(values, "calendarLayout", request.calendarLayout());
        putIfPresent(values, "calendarBirthdaysEnabled", request.calendarBirthdaysEnabled());
        putIfPresent(values, "birthdayNotificationsEnabled", request.birthdayNotificationsEnabled());
        putIfPresent(values, "birthdayNotificationDaysBefore", request.birthdayNotificationDaysBefore());
        putIfPresent(values, "eventStatusPlannedColor", request.eventStatusPlannedColor());
        putIfPresent(values, "eventStatusActiveColor", request.eventStatusActiveColor());
        putIfPresent(values, "eventStatusDoneColor", request.eventStatusDoneColor());
        putIfPresent(values, "eventStatusCanceledColor", request.eventStatusCanceledColor());
        putIfPresent(values, "calendarEventColorMode", request.calendarEventColorMode());
        putIfPresent(values, "eventTypeOtherColor", request.eventTypeOtherColor());
        putIfPresent(values, "eventTypeServiceColor", request.eventTypeServiceColor());
        putIfPresent(values, "eventTypeMeetingColor", request.eventTypeMeetingColor());
        putIfPresent(values, "eventTypeEventColor", request.eventTypeEventColor());
        putIfPresent(values, "eventTypeStudyColor", request.eventTypeStudyColor());
        putIfPresent(values, "eventTypeActDeCultColor", request.eventTypeActDeCultColor());
        putIfPresent(values, "eventTypeEvangelismColor", request.eventTypeEvangelismColor());
        putIfPresent(values, "eventTypeFellowshipColor", request.eventTypeFellowshipColor());
        putIfPresent(values, "eventTypeFuneralColor", request.eventTypeFuneralColor());
        putIfPresent(values, "eventTypeItColor", request.eventTypeItColor());
        putIfPresent(values, "eventTypeMusicColor", request.eventTypeMusicColor());
        putIfPresent(values, "eventTypeAdministrationColor", request.eventTypeAdministrationColor());
        putIfPresent(values, "eventTypeMaintenanceColor", request.eventTypeMaintenanceColor());
        putIfPresent(values, "eventTypeSocialMediaPublishingColor", request.eventTypeSocialMediaPublishingColor());
        putIfPresent(values, "eventTypeRenovationColor", request.eventTypeRenovationColor());
        putIfPresent(values, "priorityLowColor", request.priorityLowColor());
        putIfPresent(values, "priorityMediumLowColor", request.priorityMediumLowColor());
        putIfPresent(values, "priorityMediumColor", request.priorityMediumColor());
        putIfPresent(values, "priorityHighMediumColor", request.priorityHighMediumColor());
        putIfPresent(values, "priorityHighColor", request.priorityHighColor());
        putIfPresent(values, "searchIgnoreDiacritics", request.searchIgnoreDiacritics());

        values.forEach((key, value) -> {
            String settingKey = PREFIX + key;
            AppSetting setting = appSettingRepository.findById(settingKey)
                    .orElseGet(() -> new AppSetting(settingKey, value));
            setting.setValue(value.toLowerCase());
            appSettingRepository.save(setting);
        });
        return response(values);
    }

    @Transactional
    public AppearanceSettingsResponse reset() {
        appSettingRepository.deleteAllById(DEFAULTS.keySet().stream().map(key -> PREFIX + key).toList());
        return response(DEFAULTS);
    }

    private void putIfPresent(Map<String, String> values, String key, String value) {
        if (value != null && !value.isBlank()) {
            values.put(key, value);
        }
    }

    private AppearanceSettingsResponse response(Map<String, String> values) {
        return new AppearanceSettingsResponse(
                values.get("backgroundStart"),
                values.get("backgroundMiddle"),
                values.get("backgroundEnd"),
                values.get("surface"),
                values.get("surfaceMuted"),
                values.get("border"),
                values.get("text"),
                values.get("muted"),
                values.get("primary"),
                values.get("primaryStrong"),
                values.get("primarySoft"),
                values.get("accent"),
                values.get("info"),
                values.get("danger"),
                values.get("toolbarBackground"),
                values.get("tableHeaderStart"),
                values.get("tableHeaderEnd"),
                values.get("tableNameColor"),
                values.get("tableBodyColor"),
                values.get("tableNameFontFamily"),
                values.get("tableBodyFontFamily"),
                values.get("tableHeaderFontSize"),
                values.get("tableNameFontSize"),
                values.get("tableBodyFontSize"),
                values.get("tablePriorityDisplay"),
                values.get("calendarEventColor"),
                values.get("calendarEventFontFamily"),
                values.get("calendarEventFontSize"),
                values.get("calendarEventBold"),
                values.get("calendarEventItalic"),
                values.get("calendarLayout"),
                values.get("calendarBirthdaysEnabled"),
                values.get("birthdayNotificationsEnabled"),
                values.get("birthdayNotificationDaysBefore"),
                values.get("eventStatusPlannedColor"),
                values.get("eventStatusActiveColor"),
                values.get("eventStatusDoneColor"),
                values.get("eventStatusCanceledColor"),
                values.get("calendarEventColorMode"),
                values.get("eventTypeOtherColor"),
                values.get("eventTypeServiceColor"),
                values.get("eventTypeMeetingColor"),
                values.get("eventTypeEventColor"),
                values.get("eventTypeStudyColor"),
                values.get("eventTypeActDeCultColor"),
                values.get("eventTypeEvangelismColor"),
                values.get("eventTypeFellowshipColor"),
                values.get("eventTypeFuneralColor"),
                values.get("eventTypeItColor"),
                values.get("eventTypeMusicColor"),
                values.get("eventTypeAdministrationColor"),
                values.get("eventTypeMaintenanceColor"),
                values.get("eventTypeSocialMediaPublishingColor"),
                values.get("eventTypeRenovationColor"),
                values.get("priorityLowColor"),
                values.get("priorityMediumLowColor"),
                values.get("priorityMediumColor"),
                values.get("priorityHighMediumColor"),
                values.get("priorityHighColor"),
                values.get("searchIgnoreDiacritics"));
    }
}
