package ro.church_office.modern.database.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockMultipartFile;

import ro.church_office.modern.database.dto.DatabaseImportResponse;

class DatabaseExportServiceTest {
    @TempDir
    Path tempDir;

    @Test
    void exportsSqliteDatabaseToTemporaryBackupFile() throws Exception {
        Path database = tempDir.resolve("source.sqlite");
        createModernMinistryDatabase(database, "export");
        String url = "jdbc:sqlite:" + database;
        try (Connection connection = DriverManager.getConnection(url);
                Statement statement = connection.createStatement()) {
            statement.execute("create table sample_export(id integer primary key, name text not null)");
            statement.execute("insert into sample_export(name) values ('Test')");
        }
        DriverManagerDataSource dataSource = new DriverManagerDataSource(url);
        dataSource.setDriverClassName("org.sqlite.JDBC");
        DatabaseExportService service = new DatabaseExportService(dataSource, url);

        DatabaseExport export = service.exportSqlite();

        assertThat(export.filename()).startsWith("modern-ministry-db-").endsWith(".sqlite");
        assertThat(export.size()).isGreaterThan(0);
        assertThat(Files.exists(export.path())).isTrue();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + export.path());
                Statement statement = connection.createStatement();
                var result = statement.executeQuery("select name from sample_export")) {
            assertThat(result.next()).isTrue();
            assertThat(result.getString(1)).isEqualTo("Test");
        } finally {
            service.deleteExport(export);
        }
        assertThat(Files.exists(export.path())).isFalse();
    }

    @Test
    void importsValidatedSqliteDatabaseAndCreatesBackup() throws Exception {
        Path currentDatabase = tempDir.resolve("current.sqlite");
        Path importedDatabase = tempDir.resolve("imported.sqlite");
        createModernMinistryDatabase(currentDatabase, "current");
        createModernMinistryDatabase(importedDatabase, "imported");
        String url = "jdbc:sqlite:" + currentDatabase;
        DriverManagerDataSource dataSource = new DriverManagerDataSource(url);
        dataSource.setDriverClassName("org.sqlite.JDBC");
        DatabaseExportService service = new DatabaseExportService(dataSource, url);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "modern-ministry-db.sqlite",
                "application/octet-stream",
                Files.readAllBytes(importedDatabase));

        DatabaseImportResponse response = service.importSqlite(file);

        assertThat(response.restartRequired()).isTrue();
        assertThat(response.backupPath()).isNotBlank();
        assertThat(settingValue(currentDatabase)).isEqualTo("imported");
        assertThat(settingValue(Path.of(response.backupPath()))).isEqualTo("current");
    }

    @Test
    void exportedDatabaseCanBeImportedAgain() throws Exception {
        Path database = tempDir.resolve("round-trip.sqlite");
        createModernMinistryDatabase(database, "round-trip");
        String url = "jdbc:sqlite:" + database;
        DriverManagerDataSource dataSource = new DriverManagerDataSource(url);
        dataSource.setDriverClassName("org.sqlite.JDBC");
        DatabaseExportService service = new DatabaseExportService(dataSource, url);

        DatabaseExport export = service.exportSqlite();
        try {
            MockMultipartFile file = new MockMultipartFile(
                    "file",
                    export.filename(),
                    "application/vnd.sqlite3",
                    Files.readAllBytes(export.path()));

            DatabaseImportResponse response = service.importSqlite(file);

            assertThat(response.restartRequired()).isTrue();
            assertThat(settingValue(database)).isEqualTo("round-trip");
        } finally {
            service.deleteExport(export);
        }
    }

    @Test
    void rejectsDatabaseWithOrphanedReferences() throws Exception {
        Path currentDatabase = tempDir.resolve("current.sqlite");
        Path importedDatabase = tempDir.resolve("orphan.sqlite");
        createModernMinistryDatabase(currentDatabase, "current");
        createModernMinistryDatabase(importedDatabase, "orphan");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + importedDatabase);
                Statement statement = connection.createStatement()) {
            statement.execute("create table church_groups(id integer primary key, name text not null)");
            statement.execute("create table events(id integer primary key, group_id integer, event_name text)");
            statement.execute("insert into events(id, group_id, event_name) values (1, 999, 'Orphan')");
        }
        String url = "jdbc:sqlite:" + currentDatabase;
        DriverManagerDataSource dataSource = new DriverManagerDataSource(url);
        dataSource.setDriverClassName("org.sqlite.JDBC");
        DatabaseExportService service = new DatabaseExportService(dataSource, url);
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "orphan.sqlite",
                "application/vnd.sqlite3",
                Files.readAllBytes(importedDatabase));

        assertThatThrownBy(() -> service.importSqlite(file))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("referințe invalide");
        assertThat(settingValue(currentDatabase)).isEqualTo("current");
    }

    private void createModernMinistryDatabase(Path database, String marker) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + database);
                Statement statement = connection.createStatement()) {
            statement.execute("create table churches(id integer primary key, name text not null)");
            statement.execute("create table user_accounts(id integer primary key, username text not null)");
            statement.execute("create table app_settings(setting_key text primary key, setting_value text)");
            statement.execute("insert into churches(id, name) values (1, 'Church')");
            statement.execute("insert into user_accounts(id, username) values (1, 'admin')");
            statement.execute("insert into app_settings(setting_key, setting_value) values ('marker', '" + marker + "')");
        }
    }

    private String settingValue(Path database) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + database);
                Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery(
                        "select setting_value from app_settings where setting_key = 'marker'")) {
            assertThat(result.next()).isTrue();
            return result.getString(1);
        }
    }
}
