package ro.church_office.modern.event.attachment.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import ro.church_office.modern.common.ResourceNotFoundException;
import ro.church_office.modern.event.attachment.dao.EventAttachment;
import ro.church_office.modern.event.attachment.dao.EventAttachmentRepository;
import ro.church_office.modern.event.attachment.dto.EventAttachmentResponse;
import ro.church_office.modern.event.dao.Event;
import ro.church_office.modern.event.dao.EventRepository;
import ro.church_office.modern.settings.service.ChurchSettingsService;

@Service
public class EventAttachmentService {
    private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final EventRepository eventRepository;
    private final EventAttachmentRepository attachmentRepository;
    private final ChurchSettingsService churchSettingsService;
    private final Path uploadRoot;

    public EventAttachmentService(
            EventRepository eventRepository,
            EventAttachmentRepository attachmentRepository,
            ChurchSettingsService churchSettingsService,
            @Value("${modern.ministry.data-dir}") String dataDir) {
        this.eventRepository = eventRepository;
        this.attachmentRepository = attachmentRepository;
        this.churchSettingsService = churchSettingsService;
        this.uploadRoot = Path.of(dataDir).resolve("uploads").resolve("events").toAbsolutePath().normalize();
    }

    @Transactional(readOnly = true)
    public List<EventAttachmentResponse> list(Long eventId) {
        loadEvent(eventId);
        return attachmentRepository.findAllByEventIdAndChurchIdOrderByCreatedAtDesc(eventId, activeChurchId())
                .stream()
                .map(EventAttachmentResponse::from)
                .toList();
    }

    @Transactional
    public List<EventAttachmentResponse> upload(Long eventId, List<MultipartFile> files) {
        Event event = loadEvent(eventId);
        if (files == null || files.isEmpty()) {
            throw new IllegalArgumentException("Selectează cel puțin o imagine.");
        }

        return files.stream()
                .map(file -> saveFile(event, file))
                .map(EventAttachmentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public EventAttachmentFile file(Long eventId, Long attachmentId) {
        EventAttachment attachment = loadAttachment(eventId, attachmentId);
        Path path = Path.of(attachment.getStoragePath()).toAbsolutePath().normalize();
        if (!path.startsWith(uploadRoot) || !Files.exists(path)) {
            throw new ResourceNotFoundException("Attachment file not found: " + attachmentId);
        }
        return new EventAttachmentFile(attachment, path);
    }

    @Transactional
    public void delete(Long eventId, Long attachmentId) {
        EventAttachment attachment = loadAttachment(eventId, attachmentId);
        attachmentRepository.delete(attachment);
        try {
            Files.deleteIfExists(Path.of(attachment.getStoragePath()));
        } catch (IOException ex) {
            throw new IllegalStateException("Nu s-a putut șterge fișierul atașat.", ex);
        }
    }

    private EventAttachment saveFile(Event event, MultipartFile file) {
        validate(file);
        String originalName = sanitizeFileName(file.getOriginalFilename());
        String storedName = UUID.randomUUID() + extension(originalName, file.getContentType());
        Path eventDir = uploadRoot.resolve(String.valueOf(event.getId())).normalize();
        Path target = eventDir.resolve(storedName).normalize();
        if (!target.startsWith(eventDir)) {
            throw new IllegalArgumentException("Nume fișier invalid.");
        }

        try {
            Files.createDirectories(eventDir);
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Nu s-a putut salva imaginea.", ex);
        }

        EventAttachment attachment = new EventAttachment();
        attachment.setEvent(event);
        attachment.setChurchId(activeChurchId());
        attachment.setFileName(originalName);
        attachment.setContentType(file.getContentType());
        attachment.setFileSize(file.getSize());
        attachment.setStoragePath(target.toString());
        return attachmentRepository.save(attachment);
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Imaginea este goală.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Imaginea depășește limita de 5 MB.");
        }
        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new IllegalArgumentException("Sunt acceptate doar imagini JPEG, PNG, WebP sau GIF.");
        }
    }

    private Event loadEvent(Long eventId) {
        return eventRepository.findByIdAndChurchIdAndDeletedFalse(eventId, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Event not found: " + eventId));
    }

    private EventAttachment loadAttachment(Long eventId, Long attachmentId) {
        loadEvent(eventId);
        return attachmentRepository.findByIdAndEventIdAndChurchId(attachmentId, eventId, activeChurchId())
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found: " + attachmentId));
    }

    private Long activeChurchId() {
        return churchSettingsService.activeChurchId();
    }

    private String sanitizeFileName(String originalName) {
        String fallback = "imagine";
        if (originalName == null || originalName.isBlank()) {
            return fallback;
        }
        String cleaned = Path.of(originalName).getFileName().toString().replaceAll("[\\r\\n]", "").trim();
        return cleaned.isBlank() ? fallback : cleaned;
    }

    private String extension(String fileName, String contentType) {
        int index = fileName.lastIndexOf('.');
        if (index >= 0 && index < fileName.length() - 1) {
            return fileName.substring(index).toLowerCase(Locale.ROOT);
        }
        return switch (contentType) {
            case "image/jpeg" -> ".jpg";
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            case "image/gif" -> ".gif";
            default -> ".img";
        };
    }
}
