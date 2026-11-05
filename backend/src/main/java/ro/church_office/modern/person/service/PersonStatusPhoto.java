package ro.church_office.modern.person.service;

import java.nio.file.Path;

public record PersonStatusPhoto(
        String fileName,
        String contentType,
        Long fileSize,
        Path path
) {
}
