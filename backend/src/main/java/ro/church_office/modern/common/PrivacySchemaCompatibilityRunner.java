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
        addColumnIfMissing(connection, columns, "persons", "description");
        addColumnIfMissing(connection, columns, "persons", "description_private");
        addColumnIfMissing(connection, columns, "persons", "description_owner_username");
        createTableIfMissing(connection, """
                create table if not exists person_private_descriptions (
                    person_id bigint not null,
                    username varchar(255) not null,
                    description varchar(3000),
                    primary key (person_id, username)
                )
                """);
        migrateLegacyPersonDescriptions(connection);
    }

    private void ensureEventsColumns(Connection connection) throws SQLException {
        Set<String> columns = columns(connection, "events");
        addColumnIfMissing(connection, columns, "events", "about_private");
        addColumnIfMissing(connection, columns, "events", "about_owner_username");
        addColumnIfMissing(connection, columns, "events", "contacted_person_id");
        addColumnIfMissing(connection, columns, "events", "event_session");
        createTableIfMissing(connection, """
                create table if not exists event_private_descriptions (
                    event_id bigint not null,
                    username varchar(255) not null,
                    description varchar(3000),
                    primary key (event_id, username)
                )
                """);
        migrateLegacyEventDescriptions(connection);
        ensureEventContactedPersonsTable(connection);
        ensureEventTypeConstraint(connection);
    }

    private void ensureFinanceColumns(Connection connection) throws SQLException {
        Set<String> columns = columns(connection, "financial_transactions");
        addColumnIfMissing(connection, columns, "financial_transactions", "amount_private");
        addColumnIfMissing(connection, columns, "financial_transactions", "amount_owner_username");
    }

    private void ensureGroupColumns(Connection connection) throws SQLException {
        Set<String> columns = columns(connection, "church_groups");
        addColumnIfMissing(connection, columns, "church_groups", "whatsapp_link");
    }

    private Set<String> columns(Connection connection, String table) throws SQLException {
        Set<String> columns = new HashSet<>();
        try (ResultSet result = connection.getMetaData().getColumns(null, null, table, null)) {
            while (result.next()) {
                columns.add(result.getString("COLUMN_NAME"));
            }
        }
        return columns;
    }

    private void addColumnIfMissing(Connection connection,
            Set<String> columns,
            String table,
            String column) throws SQLException {
        if (columns.contains(column)) {
            return;
        }
        try (Statement statement = connection.createStatement()) {
            switch (table + "." + column) {
                case "persons.description" -> statement.execute("ALTER TABLE persons ADD COLUMN description varchar(3000)");
                case "persons.description_private" -> statement.execute(
                        "ALTER TABLE persons ADD COLUMN description_private boolean not null default 0");
                case "persons.description_owner_username" -> statement.execute(
                        "ALTER TABLE persons ADD COLUMN description_owner_username varchar(255)");
                case "events.about_private" -> statement.execute(
                        "ALTER TABLE events ADD COLUMN about_private boolean not null default 0");
                case "events.about_owner_username" -> statement.execute(
                        "ALTER TABLE events ADD COLUMN about_owner_username varchar(255)");
                case "events.contacted_person_id" -> statement.execute(
                        "ALTER TABLE events ADD COLUMN contacted_person_id bigint");
                case "events.event_session" -> statement.execute(
                        "ALTER TABLE events ADD COLUMN event_session varchar(255)");
                case "financial_transactions.amount_private" -> statement.execute(
                        "ALTER TABLE financial_transactions ADD COLUMN amount_private boolean not null default 0");
                case "financial_transactions.amount_owner_username" -> statement.execute(
                        "ALTER TABLE financial_transactions ADD COLUMN amount_owner_username varchar(255)");
                case "church_groups.whatsapp_link" -> statement.execute(
                        "ALTER TABLE church_groups ADD COLUMN whatsapp_link varchar(1000)");
                default -> throw new IllegalArgumentException("Migrare SQLite necunoscută: " + table + "." + column);
            }
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

    private void migrateLegacyPersonDescriptions(Connection connection) throws SQLException {
        String sql = """
                insert into person_private_descriptions (person_id, username, description)
                select id, description_owner_username, description
                from persons
                where description_private = 1
                  and description_owner_username is not null
                  and trim(description_owner_username) <> ''
                  and description is not null
                  and trim(description) <> ''
                  and not exists (
                    select 1 from person_private_descriptions existing
                    where existing.person_id = persons.id
                      and lower(existing.username) = lower(persons.description_owner_username)
                  )
                """;
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate(sql);
        }
    }

    private void migrateLegacyEventDescriptions(Connection connection) throws SQLException {
        String sql = """
                insert into event_private_descriptions (event_id, username, description)
                select id, about_owner_username, about
                from events
                where about_private = 1
                  and about_owner_username is not null
                  and trim(about_owner_username) <> ''
                  and about is not null
                  and trim(about) <> ''
                  and not exists (
                    select 1 from event_private_descriptions existing
                    where existing.event_id = events.id
                      and lower(existing.username) = lower(events.about_owner_username)
                  )
                """;
        try (Statement statement = connection.createStatement()) {
            statement.executeUpdate(sql);
        }
    }
}
