package ro.church_office.modern.database.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

import javax.sql.DataSource;

import ro.church_office.modern.database.dto.DatabaseImportResponse;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class DatabaseExportService {
    private static final DateTimeFormatter FILENAME_TIMESTAMP = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss");
    private static final Set<String> REQUIRED_TABLES = Set.of("churches", "user_accounts", "app_settings");
    private static final List<ReferenceCheck> REFERENCE_CHECKS = List.of(
            new ReferenceCheck("events", "group_id", "church_groups", "id", "evenimente → grupuri"),
            new ReferenceCheck("events", "implemented_by_id", "persons", "id", "evenimente → persoane responsabile"),
            new ReferenceCheck("events", "contacted_person_id", "persons", "id", "evenimente → persoane contactate"),
            new ReferenceCheck("event_contacted_persons", "event_id", "events", "id", "persoane contactate → evenimente"),
            new ReferenceCheck("event_contacted_persons", "person_id", "persons", "id", "persoane contactate → persoane"),
            new ReferenceCheck("event_responsibles", "event_id", "events", "id", "responsabili → evenimente"),
            new ReferenceCheck("event_responsibles", "person_id", "persons", "id", "responsabili → persoane"),
            new ReferenceCheck("event_attachments", "event_id", "events", "id", "atașamente → evenimente"),
            new ReferenceCheck("event_private_descriptions", "event_id", "events", "id", "descrieri private → evenimente"),
            new ReferenceCheck("person_private_descriptions", "person_id", "persons", "id", "descrieri private → persoane"),
            new ReferenceCheck("church_groups", "leader_id", "persons", "id", "grupuri → lideri"),
            new ReferenceCheck("church_group_members", "group_id", "church_groups", "id", "membri grupuri → grupuri"),
            new ReferenceCheck("church_group_members", "person_id", "persons", "id", "membri grupuri → persoane"),
            new ReferenceCheck("family_members", "family_id", "families", "id", "membri familii → familii"),
            new ReferenceCheck("family_members", "person_id", "persons", "id", "membri familii → persoane"),
            new ReferenceCheck("family_relationships", "family_id", "families", "id", "relații familii → familii"),
            new ReferenceCheck("family_relationships", "person_a_id", "persons", "id", "relații familii → persoane"),
            new ReferenceCheck("family_relationships", "person_b_id", "persons", "id", "relații familii → persoane"),
            new ReferenceCheck("social_support_cases", "person_id", "persons", "id", "sprijin social → persoane"),
            new ReferenceCheck("social_support_cases", "assigned_to_id", "persons", "id", "sprijin social → responsabili"));

    private final DataSource dataSource;
    private final String datasourceUrl;

    public DatabaseExportService(DataSource dataSource, @Value("${spring.datasource.url}") String datasourceUrl) {
        this.dataSource = dataSource;
        this.datasourceUrl = datasourceUrl;
    }

    public DatabaseExport exportSqlite() {
        requireSqlite("Exportul bazei de date este disponibil momentan doar pentru SQLite.");

        Path exportPath = null;
        try {
            Path dataDir = currentDatabasePath().getParent();
            Files.createDirectories(dataDir);
            exportPath = Files.createTempFile(dataDir, "modern-ministry-db-", ".sqlite");
            Files.deleteIfExists(exportPath);
            backupCurrentDatabaseTo(exportPath);
            validateImportedDatabase(exportPath);
            String filename = "modern-ministry-db-" + LocalDateTime.now().format(FILENAME_TIMESTAMP) + ".sqlite";
            return new DatabaseExport(exportPath, filename, Files.size(exportPath));
        } catch (SQLException | IOException ex) {
            if (exportPath != null) {
                try {
                    Files.deleteIfExists(exportPath);
                } catch (IOException ignored) {
                    // The original export error is more useful to the caller.
                }
            }
            throw new IllegalStateException("Nu s-a putut genera exportul bazei de date.", ex);
        }
    }

    public DatabaseImportResponse importSqlite(MultipartFile file) {
        requireSqlite("Importul bazei de date este disponibil momentan doar pentru SQLite.");
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Alege un fișier SQLite pentru import.");
        }

        Path currentDatabase = currentDatabasePath();
        Path dataDir = currentDatabase.getParent();
        Path uploaded = null;
        try {
            Files.createDirectories(dataDir);
            uploaded = Files.createTempFile(dataDir, "modern-ministry-import-", ".sqlite");
            try (InputStream input = file.getInputStream()) {
                Files.copy(input, uploaded, StandardCopyOption.REPLACE_EXISTING);
            }
            validateImportedDatabase(uploaded);

            Path backupPath = backupPath(dataDir);
            backupCurrentDatabaseTo(backupPath);
            closeDataSourceBeforeReplace();
            replaceDatabase(uploaded, currentDatabase);

            return new DatabaseImportResponse(
                    "Importul a fost aplicat. Repornește aplicația ca să folosească noua bază de date.",
                    backupPath.toAbsolutePath().toString(),
                    true);
        } catch (IOException ex) {
            throw new IllegalStateException("Nu s-a putut importa baza de date.", ex);
        } catch (SQLException ex) {
            throw new IllegalArgumentException("Fișierul selectat nu este o bază SQLite validă pentru aplicație.", ex);
        } finally {
            if (uploaded != null) {
                try {
                    Files.deleteIfExists(uploaded);
                } catch (IOException ignored) {
                    // The import result or validation error is more important than temp cleanup.
                }
            }
        }
    }

    public void deleteExport(DatabaseExport export) {
        try {
            Files.deleteIfExists(export.path());
        } catch (IOException ignored) {
            // Temporary export cleanup must not mask the response streaming result.
        }
    }

    private void backupCurrentDatabaseTo(Path target) throws SQLException, IOException {
        Files.deleteIfExists(target);
        try (Connection connection = dataSource.getConnection();
                PreparedStatement statement = connection.prepareStatement("VACUUM INTO ?")) {
            statement.setString(1, target.toAbsolutePath().toString());
            statement.execute();
        }
    }

    private void validateImportedDatabase(Path database) throws SQLException {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + database.toAbsolutePath());
                Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = ON");
            assertPragmaOk(statement, "PRAGMA quick_check", "verificarea rapidă de integritate");
            assertPragmaOk(statement, "PRAGMA integrity_check", "verificarea de integritate");
            validateForeignKeys(statement);

            for (String table : REQUIRED_TABLES) {
                if (!tableExists(statement, table)) {
                    throw new IllegalArgumentException("Fișierul importat nu pare să fie o bază Modern Ministry.");
                }
            }
            validateKnownReferences(statement);
        }
    }

    private void assertPragmaOk(Statement statement, String sql, String operation) throws SQLException {
        try (ResultSet result = statement.executeQuery(sql)) {
            if (!result.next() || !"ok".equalsIgnoreCase(result.getString(1))) {
                throw new IllegalArgumentException("Fișierul SQLite nu trece " + operation + ".");
            }
        }
    }

    private void validateForeignKeys(Statement statement) throws SQLException {
        try (ResultSet result = statement.executeQuery("PRAGMA foreign_key_check")) {
            if (result.next()) {
                throw new IllegalArgumentException("Fișierul SQLite conține relații invalide între tabele.");
            }
        }
    }

    private void validateKnownReferences(Statement statement) throws SQLException {
        for (ReferenceCheck reference : REFERENCE_CHECKS) {
            if (!tableExists(statement, reference.childTable()) || !tableExists(statement, reference.parentTable())) {
                continue;
            }
            String childTable = sqliteIdentifier(reference.childTable());
            String childColumn = sqliteIdentifier(reference.childColumn());
            String parentTable = sqliteIdentifier(reference.parentTable());
            String parentColumn = sqliteIdentifier(reference.parentColumn());
            String sql = "SELECT COUNT(*) FROM " + childTable
                    + " child LEFT JOIN " + parentTable + " parent ON parent."
                    + parentColumn + " = child." + childColumn
                    + " WHERE child." + childColumn + " IS NOT NULL"
                    + " AND parent." + parentColumn + " IS NULL";
            try (ResultSet result = statement.executeQuery(sql)) {
                if (result.next() && result.getLong(1) > 0) {
                    throw new IllegalArgumentException("Fișierul importat conține referințe invalide ("
                            + reference.description() + "). Repară baza înainte de import.");
                }
            }
        }
    }

    private boolean tableExists(Statement statement, String table) throws SQLException {
        try (PreparedStatement query = statement.getConnection().prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")) {
            query.setString(1, table);
            try (ResultSet result = query.executeQuery()) {
                return result.next();
            }
        }
    }

    private Path backupPath(Path dataDir) throws IOException {
        Path backupsDir = dataDir.resolve("database-backups");
        Files.createDirectories(backupsDir);
        String filename = "modern-ministry-before-import-" + LocalDateTime.now().format(FILENAME_TIMESTAMP) + ".sqlite";
        return backupsDir.resolve(filename);
    }

    private Path currentDatabasePath() {
        String value = datasourceUrl.substring("jdbc:sqlite:".length());
        if (value.isBlank() || value.equals(":memory:") || value.startsWith("file:")) {
            throw new IllegalStateException("Importul este disponibil doar pentru baze SQLite stocate ca fișier local.");
        }
        return Path.of(value).toAbsolutePath().normalize();
    }

    private void replaceDatabase(Path uploaded, Path currentDatabase) throws IOException {
        try {
            Files.move(uploaded, currentDatabase, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (AtomicMoveNotSupportedException ex) {
            Files.move(uploaded, currentDatabase, StandardCopyOption.REPLACE_EXISTING);
        }
    }

    private void closeDataSourceBeforeReplace() {
        if (dataSource instanceof AutoCloseable closeable) {
            try {
                closeable.close();
            } catch (Exception ex) {
                throw new IllegalStateException("Nu s-au putut închide conexiunile bazei de date înainte de import.", ex);
            }
        }
    }

    private void requireSqlite(String message) {
        if (!datasourceUrl.startsWith("jdbc:sqlite:")) {
            throw new IllegalStateException(message);
        }
    }

    private String sqliteIdentifier(String identifier) {
        if (identifier == null || !identifier.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Identificator SQLite invalid: " + identifier);
        }
        return "\"" + identifier + "\"";
    }

    private record ReferenceCheck(
            String childTable,
            String childColumn,
            String parentTable,
            String parentColumn,
            String description) {
    }
}
