package ro.church_office.modern.event.attachment.dto;

import java.time.Instant;

import ro.church_office.modern.event.attachment.dao.EventAttachment;

public record EventAttachmentResponse(
        Long id,
        Long eventId,
        String fileName,
        String contentType,
        long fileSize,
        Instant createdAt
) {
    public static EventAttachmentResponse from(EventAttachment attachment) {
        return new EventAttachmentResponse(
                attachment.getId(),
                attachment.getEvent().getId(),
                attachment.getFileName(),
                attachment.getContentType(),
                attachment.getFileSize(),
                attachment.getCreatedAt());
    }
}
