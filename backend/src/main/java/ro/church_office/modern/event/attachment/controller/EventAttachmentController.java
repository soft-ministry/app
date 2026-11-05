package ro.church_office.modern.event.attachment.controller;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

import org.springframework.core.io.FileSystemResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import ro.church_office.modern.event.attachment.dto.EventAttachmentResponse;
import ro.church_office.modern.event.attachment.service.EventAttachmentFile;
import ro.church_office.modern.event.attachment.service.EventAttachmentService;

@RestController
@RequestMapping("/api/events/{eventId}/attachments")
public class EventAttachmentController {
    private final EventAttachmentService eventAttachmentService;

    public EventAttachmentController(EventAttachmentService eventAttachmentService) {
        this.eventAttachmentService = eventAttachmentService;
    }

    @GetMapping
    public List<EventAttachmentResponse> list(@PathVariable Long eventId) {
        return eventAttachmentService.list(eventId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<EventAttachmentResponse> upload(
            @PathVariable Long eventId,
            @RequestParam("files") List<MultipartFile> files) {
        return eventAttachmentService.upload(eventId, files);
    }

    @GetMapping("/{attachmentId}/content")
    public ResponseEntity<FileSystemResource> content(@PathVariable Long eventId, @PathVariable Long attachmentId) {
        EventAttachmentFile file = eventAttachmentService.file(eventId, attachmentId);
        String encodedName = URLEncoder.encode(file.attachment().getFileName(), StandardCharsets.UTF_8)
                .replace("+", "%20");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.attachment().getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(encodedName, StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .body(new FileSystemResource(file.path()));
    }

    @DeleteMapping("/{attachmentId}")
    public ResponseEntity<Void> delete(@PathVariable Long eventId, @PathVariable Long attachmentId) {
        eventAttachmentService.delete(eventId, attachmentId);
        return ResponseEntity.noContent().build();
    }
}
