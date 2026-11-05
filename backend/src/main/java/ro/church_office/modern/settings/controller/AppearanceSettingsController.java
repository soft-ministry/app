package ro.church_office.modern.settings.controller;

import jakarta.validation.Valid;

import ro.church_office.modern.settings.dto.AppearanceSettingsRequest;
import ro.church_office.modern.settings.dto.AppearanceSettingsResponse;
import ro.church_office.modern.settings.service.AppearanceSettingsService;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings/appearance")
public class AppearanceSettingsController {
    private final AppearanceSettingsService appearanceSettingsService;

    public AppearanceSettingsController(AppearanceSettingsService appearanceSettingsService) {
        this.appearanceSettingsService = appearanceSettingsService;
    }

    @GetMapping
    public AppearanceSettingsResponse get() {
        return appearanceSettingsService.get();
    }

    @PutMapping
    public AppearanceSettingsResponse update(@Valid @RequestBody AppearanceSettingsRequest request) {
        return appearanceSettingsService.update(request);
    }

    @DeleteMapping
    public AppearanceSettingsResponse reset() {
        return appearanceSettingsService.reset();
    }
}
