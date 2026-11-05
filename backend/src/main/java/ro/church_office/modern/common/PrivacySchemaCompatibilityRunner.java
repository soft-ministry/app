package ro.church_office.modern.common;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

import javax.sql.DataSource;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class PrivacySchemaCompatibilityRunner implements ApplicationRunner {
    private final DataSource dataSource;

    public PrivacySchemaCompatibilityRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            if (!isSqlite(connection)) {
                return;
            }
            ensurePersonsColumns(connection);
            ensureEventsColumns(connection);
            ensureGroupColumns(connection);
            ensureFamilyMemberRoleConstraint(connection);
            ensureFinanceColumns(connection);
        }
    }

    private void ensurePersonsColumns(Connection connection) throws SQLException {
        Set<String> columns = columns(connection, "persons");
        addColumnIfMissing(connection, columns, "persons", "description", "description varchar(3000)");
        addColumnIfMissing(connection, columns, "persons", "description_private", "description_private boolean not null default 0");
        addColumnIfMissing(connection, columns, "persons", "description_owner_username", "description_owner_username varchar(255)");
        createTableIfMissing(connection, """
                create table if not exists person_private_descriptions (
                    person_id bigint not null,
                    username varchar(255) not null,
                    description varchar(3000),
                    primary key (person_id, username)
                )
                """);
        migrateLegacyPrivateDescriptions(connection,
                "persons",
                "person_private_descriptions",
                "person_id",
                "description_private",
                "description_owner_username",
                "description");
    }

    private void ensureEventsColumns(Connection connection) throws SQLException {
        Set<String> columns = columns(connection, "events");
        addColumnIfMissing(connection, columns, "events", "about_private", "about_private boolean not null default 0");
        addColumnIfMissing(connection, columns, "events", "about_owner_username", "about_owner_username varchar(255)");
        addColumnIfMissing(connection, columns, "events", "contacted_person_id", "contacted_person_id bigint");
        addColumnIfMissing(connection, columns, "events", "event_session", "event_session varchar(255)");
        createTableIfMissing(connection, """
                create table if not exists event_private_descriptions (
                    event_id bigint not null,
                    username varchar(255) not null,
                    description varchar(3000),
                    primary key (event_id, username)
                )
                """);
        migrateLegacyPrivateDescriptions(connection,
                "events",
                "event_private_descriptions",
                "event_id",
                "about_private",
                "about_owner_username",
                "about");
        ensureEventContactedPersonsTable(connection);
        ensureEventTypeConstraint(connection);
    }

    private void ensureFinanceColumns(Connection connection) throws SQLException {
        Set<String> columns = columns(connection, "financial_transactions");
        addColumnIfMissing(connection, columns, "financial_transactions", "amount_private", "amount_private boolean not null default 0");
        addColumnIfMissing(connection, columns, "financial_transactions", "amount_owner_username", "amount_owner_username varchar(255)");
    }

    private void ensureGroupColumns(Connection connection) throws SQLException {
        Set<String> columns = columns(connection, "church_groups");
        addColumnIfMissing(connection, columns, "church_groups", "whatsapp_link", "whatsapp_link varchar(1000)");
    }

    private Set<String> columns(Connection connection, String table) throws SQLException {
        Set<String> columns = new HashSet<>();
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery("PRAGMA table_info(" + sqliteIdentifier(table) + ")")) {
            while (result.next()) {
                columns.add(result.getString("name"));
            }
        }
        return columns;
    }

    private void addColumnIfMissing(Connection connection,
            Set<String> columns,
            String table,
            String column,
            String definition) throws SQLException {
        if (columns.contains(column)) {
            return;
        }
        try (Statement statement = connection.createStatement()) {
            statement.execute("ALTER TABLE " + sqliteIdentifier(table) + " ADD COLUMN " + definition);
        }
        columns.add(column);
    }

    private void createTableIfMissing(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private void ensureEventContactedPersonsTable(Connection connection) throws SQLException {
        createTableIfMissing(connection, """
                create table if not exists event_contacted_persons (
                    event_id bigint not null,
                    person_id bigint not null,
                    primary key (event_id, person_id)
                )
                """);
        if (!columns(connection, "events").contains("contacted_person_id")) {
            return;
        }
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    insert into event_contacted_persons (event_id, person_id)
                    select id, contacted_person_id
                    from events
                    where contacted_person_id is not null
                      and not exists (
                        select 1 from event_contacted_persons existing
                        where existing.event_id = events.id
                          and existing.person_id = events.contacted_person_id
                      )
                    """);
        }
    }

    private boolean isSqlite(Connection connection) throws SQLException {
        DatabaseMetaData metadata = connection.getMetaData();
        String url = metadata.getURL();
        return url != null && url.toLowerCase(Locale.ROOT).startsWith("jdbc:sqlite:");
    }

    private void ensureEventTypeConstraint(Connection connection) throws SQLException {
        String tableSql = tableSql(connection, "events");
        if (tableSql == null) {
            return;
        }
        String normalized = tableSql.toUpperCase(Locale.ROOT);
        if (!normalized.contains("EVENT_TYPE")
                || normalized.contains("SOCIAL_MEDIA_PUBLISHING")
                || !normalized.contains("CHECK")) {
            return;
        }
        rebuildEventsTableWithCurrentEventTypes(connection);
    }

    private String tableSql(Connection connection, String table) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name=?")) {
            statement.setString(1, table);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getString(1) : null;
            }
        }
    }

    private void rebuildEventsTableWithCurrentEventTypes(Connection connection) throws SQLException {
        boolean previousAutoCommit = connection.getAutoCommit();
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=OFF");
            connection.setAutoCommit(false);
            statement.execute("ALTER TABLE events RENAME TO events_legacy_event_type");
            statement.execute("""
                    CREATE TABLE events (
                        id integer,
                        about varchar(3000),
                        church_id bigint not null,
                        created_at timestamp not null,
                        deleted boolean not null,
                        end_date date,
                        event_name varchar(255) not null,
                        event_type varchar(255) not null check (event_type in ('OTHER','SERVICE','MEETING','EVENT','STUDY','ACT_DE_CULT','EVANGELISM','FELLOWSHIP','FUNERAL','IT','MUSIC','ADMINISTRATION','MAINTENANCE','SOCIAL_MEDIA_PUBLISHING','RENOVATION')),
                        open_date date,
                        priority varchar(255) not null check (priority in ('LOW','MEDIUM_LOW','MEDIUM','HIGH_MEDIUM','HIGH')),
                        recurrence_type varchar(255) not null check (recurrence_type in ('NONE','DAILY','WEEKLY','MONTHLY','YEARLY')),
                        status varchar(255) not null check (status in ('PLANNED','ACTIVE','DONE','CANCELED')),
                        updated_at timestamp not null,
                        group_id bigint,
                        implemented_by_id bigint,
                        contacted_person_id bigint,
                        event_session varchar(255) check (event_session in ('MORNING','EVENING')),
                        event_time time(6),
                        about_owner_username varchar(255),
                        about_private boolean not null default 0,
                        primary key (id)
                    )
                    """);
            statement.execute("""
                    INSERT INTO events (
                        id, about, church_id, created_at, deleted, end_date, event_name, event_type,
                        open_date, priority, recurrence_type, status, updated_at, group_id,
                        implemented_by_id, contacted_person_id, event_session, event_time, about_owner_username, about_private
                    )
                    SELECT
                        id, about, church_id, created_at, deleted, end_date, event_name, event_type,
                        open_date, priority, recurrence_type, status, updated_at, group_id,
                        implemented_by_id, contacted_person_id, event_session, event_time, about_owner_username, about_private
                    FROM events_legacy_event_type
                    """);
            statement.execute("DROP TABLE events_legacy_event_type");
            connection.commit();
        } catch (SQLException ex) {
            connection.rollback();
            throw ex;
        } finally {
            connection.setAutoCommit(previousAutoCommit);
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
            }
        }
    }

    private void ensureFamilyMemberRoleConstraint(Connection connection) throws SQLException {
        String tableSql = tableSql(connection, "family_members");
        if (tableSql == null) {
            return;
        }
        String normalized = tableSql.toUpperCase(Locale.ROOT);
        if (!normalized.contains("ROLE")
                || normalized.contains("WIDOWED")
                || !normalized.contains("CHECK")) {
            return;
        }
        rebuildFamilyMembersTableWithCurrentRoles(connection);
    }

    private void rebuildFamilyMembersTableWithCurrentRoles(Connection connection) throws SQLException {
        boolean previousAutoCommit = connection.getAutoCommit();
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=OFF");
            connection.setAutoCommit(false);
            statement.execute("ALTER TABLE family_members RENAME TO family_members_legacy_role");
            statement.execute("""
                    CREATE TABLE family_members (
                        id integer,
                        family_id bigint not null,
                        person_id bigint not null,
                        primary_member boolean not null,
                        role varchar(255) not null check (role in ('HUSBAND','WIFE','CHILD','PARENT','WIDOWED','OTHER')),
                        primary key (id)
                    )
                    """);
            statement.execute("""
                    INSERT INTO family_members (id, family_id, person_id, primary_member, role)
                    SELECT id, family_id, person_id, primary_member, role
                    FROM family_members_legacy_role
                    """);
            statement.execute("DROP TABLE family_members_legacy_role");
            connection.commit();
        } catch (SQLException ex) {
            connection.rollback();
            throw ex;
        } finally {
            connection.setAutoCommit(previousAutoCommit);
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
            }
        }
    }

    private void migrateLegacyPrivateDescriptions(Connection connection,
            String sourceTable,
            String targetTable,
            String targetIdColumn,
            String privateColumn,
            String ownerColumn,
            String descriptionColumn) throws SQLException {
        String sql = """
                insert into %s (%s, username, description)
                select id, %s, %s
                from %s
                where %s = 1
                  and %s is not null
                  and trim(%s) <> ''
                  and %s is not null
                  and trim(%s) <> ''
                  and not exists (
                    select 1 from %s existing
                    where existing.%s = %s.id
                      and lower(existing.username) = lower(%s.%s)
                  )
                """.formatted(
                sqliteIdentifier(targetTable),
                sqliteIdentifier(targetIdColumn),
                sqliteIdentifier(ownerColumn),
                sqliteIdentifier(descriptionColumn),
                sqliteIdentifier(sourceTable),
                sqliteIdentifier(privateColumn),
                sqliteIdentifier(ownerColumn),
                sqliteIdentifier(ownerColumn),
                sqliteIdentifier(descriptionColumn),
                sqliteIdentifier(descriptionColumn),
                sqliteIdentifier(targetTable),
                sqliteIdentifier(targetIdColumn),
                sqliteIdentifier(sourceTable),
                sqliteIdentifier(sourceTable),
                sqliteIdentifier(ownerColumn));
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate(sql);
        }
    }

    private String sqliteIdentifier(String identifier) {
        if (identifier == null || !identifier.matches("[A-Za-z_][A-Za-z0-9_]*")) {
            throw new IllegalArgumentException("Identificator SQLite invalid: " + identifier);
        }
        return "\"" + identifier + "\"";
    }
}
