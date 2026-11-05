package ro.church_office.modern.database.controller;

import java.io.IOException;
import java.io.OutputStream;
import java.nio.file.Files;

import ro.church_office.modern.database.service.DatabaseExport;
import ro.church_office.modern.database.service.DatabaseExportService;
import ro.church_office.modern.database.dto.DatabaseImportResponse;

import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

@RestController
@RequestMapping("/api/database")
public class DatabaseExportController {
    private final DatabaseExportService databaseExportService;

    public DatabaseExportController(DatabaseExportService databaseExportService) {
        this.databaseExportService = databaseExportService;
    }

    @GetMapping("/export")
    public ResponseEntity<StreamingResponseBody> export() {
        DatabaseExport export = databaseExportService.exportSqlite();
        StreamingResponseBody body = outputStream -> streamAndDelete(export, outputStream);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .contentLength(export.size())
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(export.filename())
                        .build()
                        .toString())
                .body(body);
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DatabaseImportResponse importDatabase(@RequestPart("file") MultipartFile file) {
        return databaseExportService.importSqlite(file);
    }

    private void streamAndDelete(DatabaseExport export, OutputStream outputStream) throws IOException {
        try {
            Files.copy(export.path(), outputStream);
        } finally {
            databaseExportService.deleteExport(export);
        }
    }
}
