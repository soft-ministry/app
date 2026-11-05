package ro.church_office.modern.settings.service;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import ro.church_office.modern.church.dao.Church;
import ro.church_office.modern.church.dao.ChurchRepository;
import ro.church_office.modern.settings.dao.AppSetting;
import ro.church_office.modern.settings.dao.AppSettingRepository;
import ro.church_office.modern.settings.dto.ChurchSettingsRequest;
import ro.church_office.modern.settings.dto.ChurchSettingsResponse;
import ro.church_office.modern.settings.dto.ChurchSummaryResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ChurchSettingsService {
    private static final String ACTIVE_CHURCH_ID_KEY = "church.activeId";
    private static final String ATTENDANCE_ENABLED_KEY = "attendance.enabled";
    private static final String LEGACY_NAME_KEY = "church.name";
    private static final String LEGACY_AVATAR_PATH_KEY = "church.avatarPath";
    private static final long DEFAULT_CHURCH_ID = 1L;
    private static final String DEFAULT_NAME = "Biserica Betania";
    private static final long MAX_AVATAR_SIZE = 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "image/gif", ".gif");

    private final AppSettingRepository appSettingRepository;
    private final ChurchRepository churchRepository;
    private final JdbcTemplate jdbcTemplate;
    private final Path dataDir;

    public ChurchSettingsService(AppSettingRepository appSettingRepository,
            ChurchRepository churchRepository,
            JdbcTemplate jdbcTemplate,
            @Value("${modern.ministry.data-dir}") String dataDir) {
        this.appSettingRepository = appSettingRepository;
        this.churchRepository = churchRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.dataDir = Path.of(dataDir);
    }

    @Transactional
    public ChurchSettingsResponse get() {
        return response();
    }

    @Transactional
    public ChurchSettingsResponse update(ChurchSettingsRequest request) {
        Church activeChurch = activeChurch();
        applyChurchRequest(activeChurch, request);
        churchRepository.save(activeChurch);
        if (request.attendanceEnabled() != null) {
            save(ATTENDANCE_ENABLED_KEY, String.valueOf(request.attendanceEnabled()));
        }
        return response();
    }

    @Transactional
    public ChurchSettingsResponse create(ChurchSettingsRequest request) {
        Church church = new Church(nextId(), request.name().trim());
        applyChurchRequest(church, request);
        churchRepository.save(church);
        select(church.getId());
        return response();
    }

    @Transactional
    public ChurchSettingsResponse updateChurch(Long churchId, ChurchSettingsRequest request) {
        Church church = churchRepository.findById(churchId)
                .orElseThrow(() -> new IllegalArgumentException("Biserica nu există."));
        applyChurchRequest(church, request);
        churchRepository.save(church);
        return response();
    }

    @Transactional
    public ChurchSettingsResponse select(Long churchId) {
        churchRepository.findById(churchId)
                .orElseThrow(() -> new IllegalArgumentException("Biserica nu există."));
        save(ACTIVE_CHURCH_ID_KEY, String.valueOf(churchId));
        return response();
    }

    @Transactional
    public ChurchSettingsResponse delete(Long churchId) {
        if (churchId == null || churchId == DEFAULT_CHURCH_ID) {
            throw new IllegalArgumentException("Biserica implicită nu poate fi ștearsă.");
        }
        Church church = churchRepository.findById(churchId)
                .orElseThrow(() -> new IllegalArgumentException("Biserica nu există."));
        Long activeId = activeChurch().getId();
        if (churchId.equals(activeId)) {
            Church replacement = churchRepository.findAllByOrderByNameAsc().stream()
                    .filter(item -> !churchId.equals(item.getId()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Nu există o altă biserică disponibilă."));
            save(ACTIVE_CHURCH_ID_KEY, String.valueOf(replacement.getId()));
        }

        deleteChurchData(churchId);
        deleteAvatar(church);
        churchRepository.delete(church);
        return response();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Long activeChurchId() {
        return activeChurch().getId();
    }

    @Transactional
    public ChurchSettingsResponse uploadAvatar(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Fișierul este obligatoriu.");
        }
        if (file.getSize() > MAX_AVATAR_SIZE) {
            throw new IllegalArgumentException("Imaginea trebuie să fie de maximum 1 MB.");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Sunt acceptate doar imagini JPG, PNG, WEBP sau GIF.");
        }

        Church activeChurch = activeChurch();
        Path uploadDir = dataDir.resolve("uploads").resolve("church").resolve(String.valueOf(activeChurch.getId()));
        String filename = UUID.randomUUID() + EXTENSIONS.get(contentType);
        Path target = uploadDir.resolve(filename);
        try {
            Files.createDirectories(uploadDir);
            file.transferTo(target);
        } catch (IOException exception) {
            throw new UncheckedIOException("Nu s-a putut salva imaginea bisericii.", exception);
        }

        deleteCurrentAvatar();
        activeChurch.setAvatarPath(dataDir.relativize(target).toString());
        churchRepository.save(activeChurch);
        return response();
    }

    @Transactional
    public ChurchSettingsResponse deleteAvatar() {
        deleteCurrentAvatar();
        Church activeChurch = activeChurch();
        activeChurch.setAvatarPath(null);
        churchRepository.save(activeChurch);
        return response();
    }

    @Transactional
    public ChurchAvatarFile avatarFile(Long churchId) {
        Church church = churchRepository.findById(churchId)
                .orElseThrow(() -> new IllegalArgumentException("Biserica nu există."));
        String relativePath = church.getAvatarPath();
        if (relativePath == null || relativePath.isBlank()) {
            throw new IllegalArgumentException("Nu există avatar setat pentru biserică.");
        }
        Path path = dataDir.resolve(relativePath).normalize();
        if (!path.startsWith(dataDir) || !Files.exists(path)) {
            throw new IllegalArgumentException("Imaginea bisericii nu există.");
        }
        return new ChurchAvatarFile(new FileSystemResource(path), contentType(path));
    }

    @Transactional
    public ChurchAvatarFile activeAvatarFile() {
        return avatarFile(activeChurchId());
    }

    private ChurchSettingsResponse response() {
        Church activeChurch = activeChurch();
        return new ChurchSettingsResponse(
                activeChurch.getId(),
                activeChurch.getName(),
                activeChurch.getAvatarPath() == null || activeChurch.getAvatarPath().isBlank()
                        ? null
                        : "/api/settings/church/churches/" + activeChurch.getId() + "/avatar/content",
                activeChurch.getPastorName(),
                activeChurch.getDenomination(),
                activeChurch.getAddress(),
                activeChurch.getTreasurerName(),
                activeChurch.getSecretaryName(),
                activeChurch.getContactPerson(),
                attendanceEnabled(),
                churchRepository.findAllByOrderByNameAsc().stream()
                        .map(ChurchSummaryResponse::from)
                        .toList());
    }

    @Transactional(readOnly = true)
    public boolean attendanceEnabled() {
        String value = value(ATTENDANCE_ENABLED_KEY);
        return value == null || value.isBlank() || Boolean.parseBoolean(value);
    }

    private void save(String key, String value) {
        AppSetting setting = appSettingRepository.findById(key)
                .orElseGet(() -> new AppSetting(key, value));
        setting.setValue(value);
        appSettingRepository.save(setting);
    }

    private String value(String key) {
        return appSettingRepository.findById(key).map(AppSetting::getValue).orElse(null);
    }

    private void applyChurchRequest(Church church, ChurchSettingsRequest request) {
        church.setName(request.name().trim());
        church.setPastorName(clean(request.pastorName()));
        church.setDenomination(clean(request.denomination()));
        church.setAddress(clean(request.address()));
        church.setTreasurerName(clean(request.treasurerName()));
        church.setSecretaryName(clean(request.secretaryName()));
        church.setContactPerson(clean(request.contactPerson()));
    }

    private String clean(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void deleteCurrentAvatar() {
        String relativePath = activeChurch().getAvatarPath();
        if (relativePath == null || relativePath.isBlank()) {
            return;
        }
        Path path = dataDir.resolve(relativePath).normalize();
        if (!path.startsWith(dataDir)) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException exception) {
            throw new UncheckedIOException("Nu s-a putut șterge imaginea veche.", exception);
        }
    }

    private void deleteChurchData(Long churchId) {
        jdbcTemplate.update("DELETE FROM event_attachments WHERE event_id IN (SELECT id FROM events WHERE church_id = ?)", churchId);
        jdbcTemplate.update("DELETE FROM event_private_descriptions WHERE event_id IN (SELECT id FROM events WHERE church_id = ?)", churchId);
        jdbcTemplate.update("DELETE FROM event_contacted_persons WHERE event_id IN (SELECT id FROM events WHERE church_id = ?)", churchId);
        jdbcTemplate.update("DELETE FROM event_responsibles WHERE event_id IN (SELECT id FROM events WHERE church_id = ?)", churchId);
        jdbcTemplate.update("DELETE FROM events WHERE church_id = ?", churchId);
        jdbcTemplate.update("DELETE FROM church_group_members WHERE group_id IN (SELECT id FROM church_groups WHERE church_id = ?)", churchId);
        jdbcTemplate.update("DELETE FROM church_groups WHERE church_id = ?", churchId);
        jdbcTemplate.update("DELETE FROM attendance_records WHERE church_id = ?", churchId);
        jdbcTemplate.update("DELETE FROM family_relationships WHERE family_id IN (SELECT id FROM families WHERE church_id = ?)", churchId);
        jdbcTemplate.update("DELETE FROM family_members WHERE family_id IN (SELECT id FROM families WHERE church_id = ?)", churchId);
        jdbcTemplate.update("DELETE FROM families WHERE church_id = ?", churchId);
        jdbcTemplate.update("DELETE FROM social_support_cases WHERE church_id = ?", churchId);
        jdbcTemplate.update("DELETE FROM financial_transactions WHERE church_id = ?", churchId);
        jdbcTemplate.update("DELETE FROM persons WHERE church_id = ?", churchId);
    }

    private void deleteAvatar(Church church) {
        String relativePath = church.getAvatarPath();
        if (relativePath == null || relativePath.isBlank()) {
            return;
        }
        Path path = dataDir.resolve(relativePath).normalize();
        if (!path.startsWith(dataDir)) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException exception) {
            throw new UncheckedIOException("Nu s-a putut șterge imaginea bisericii.", exception);
        }
    }

    private Church activeChurch() {
        ensureDefaultChurch();
        Long activeId = parseActiveChurchId();
        return churchRepository.findById(activeId)
                .orElseGet(() -> {
                    save(ACTIVE_CHURCH_ID_KEY, String.valueOf(DEFAULT_CHURCH_ID));
                    return churchRepository.findById(DEFAULT_CHURCH_ID)
                            .orElseThrow(() -> new IllegalStateException("Biserica implicită nu există."));
                });
    }

    private void ensureDefaultChurch() {
        if (churchRepository.existsById(DEFAULT_CHURCH_ID)) {
            if (value(ACTIVE_CHURCH_ID_KEY) == null) {
                save(ACTIVE_CHURCH_ID_KEY, String.valueOf(DEFAULT_CHURCH_ID));
            }
            cleanupLegacySettings();
            return;
        }
        Church church = new Church(DEFAULT_CHURCH_ID, legacyName());
        String legacyAvatarPath = value(LEGACY_AVATAR_PATH_KEY);
        if (legacyAvatarPath != null && !legacyAvatarPath.isBlank()) {
            church.setAvatarPath(legacyAvatarPath);
        }
        churchRepository.save(church);
        save(ACTIVE_CHURCH_ID_KEY, String.valueOf(DEFAULT_CHURCH_ID));
        cleanupLegacySettings();
    }

    private String legacyName() {
        String legacyName = value(LEGACY_NAME_KEY);
        return legacyName == null || legacyName.isBlank() || "Biserică".equals(legacyName.trim())
                ? DEFAULT_NAME
                : legacyName.trim();
    }

    private Long parseActiveChurchId() {
        String value = value(ACTIVE_CHURCH_ID_KEY);
        if (value == null || value.isBlank()) {
            return DEFAULT_CHURCH_ID;
        }
        try {
            return Long.parseLong(value);
        } catch (NumberFormatException exception) {
            return DEFAULT_CHURCH_ID;
        }
    }

    private Long nextId() {
        return Math.max(DEFAULT_CHURCH_ID, churchRepository.maxId()) + 1;
    }

    private void cleanupLegacySettings() {
        appSettingRepository.deleteById(LEGACY_NAME_KEY);
        appSettingRepository.deleteById(LEGACY_AVATAR_PATH_KEY);
    }

    private MediaType contentType(Path path) {
        try {
            String detected = Files.probeContentType(path);
            return detected == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(detected);
        } catch (IOException exception) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }

    public record ChurchAvatarFile(Resource resource, MediaType contentType) {
    }
}
