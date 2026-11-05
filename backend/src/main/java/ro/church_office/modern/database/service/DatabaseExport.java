package ro.church_office.modern.database.service;

import java.nio.file.Path;

public record DatabaseExport(Path path, String filename, long size) {
}
