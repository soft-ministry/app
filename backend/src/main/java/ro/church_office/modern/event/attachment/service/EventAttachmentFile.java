package ro.church_office.modern.event.attachment.service;

import java.nio.file.Path;

import ro.church_office.modern.event.attachment.dao.EventAttachment;

public record EventAttachmentFile(EventAttachment attachment, Path path) {
}
