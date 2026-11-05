package ro.church_office.modern.settings.controller;

import jakarta.validation.Valid;

import ro.church_office.modern.settings.dto.ChurchSettingsRequest;
import ro.church_office.modern.settings.dto.ChurchSettingsResponse;
import ro.church_office.modern.settings.service.ChurchSettingsService;
import ro.church_office.modern.settings.service.ChurchSettingsService.ChurchAvatarFile;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/settings/church")
public class ChurchSettingsController {
    private final ChurchSettingsService churchSettingsService;

    public ChurchSettingsController(ChurchSettingsService churchSettingsService) {
        this.churchSettingsService = churchSettingsService;
    }

    @GetMapping
    public ChurchSettingsResponse get() {
        return churchSettingsService.get();
    }

    @PutMapping
    public ChurchSettingsResponse update(@Valid @RequestBody ChurchSettingsRequest request) {
        return churchSettingsService.update(request);
    }

    @PostMapping("/churches")
    public ChurchSettingsResponse create(@Valid @RequestBody ChurchSettingsRequest request) {
        return churchSettingsService.create(request);
    }

    @PutMapping("/churches/{churchId}")
    public ChurchSettingsResponse updateChurch(@PathVariable Long churchId, @Valid @RequestBody ChurchSettingsRequest request) {
        return churchSettingsService.updateChurch(churchId, request);
    }

    @PostMapping("/churches/{churchId}/select")
    public ChurchSettingsResponse select(@PathVariable Long churchId) {
        return churchSettingsService.select(churchId);
    }

    @DeleteMapping("/churches/{churchId}")
    public ChurchSettingsResponse delete(@PathVariable Long churchId) {
        return churchSettingsService.delete(churchId);
    }

    @PostMapping("/avatar")
    public ChurchSettingsResponse uploadAvatar(@RequestPart("file") MultipartFile file) {
        return churchSettingsService.uploadAvatar(file);
    }

    @DeleteMapping("/avatar")
    public ChurchSettingsResponse deleteAvatar() {
        return churchSettingsService.deleteAvatar();
    }

    @GetMapping("/avatar/content")
    public ResponseEntity<?> avatarContent() {
        ChurchAvatarFile file = churchSettingsService.activeAvatarFile();
        return ResponseEntity.ok()
                .contentType(file.contentType())
                .body(file.resource());
    }

    @GetMapping("/churches/{churchId}/avatar/content")
    public ResponseEntity<?> churchAvatarContent(@PathVariable Long churchId) {
        ChurchAvatarFile file = churchSettingsService.avatarFile(churchId);
        return ResponseEntity.ok()
                .contentType(file.contentType())
                .body(file.resource());
    }
}
