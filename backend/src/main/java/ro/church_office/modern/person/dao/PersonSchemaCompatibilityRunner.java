package ro.church_office.modern.person.dao;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import javax.sql.DataSource;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class PersonSchemaCompatibilityRunner implements ApplicationRunner {
    private static final String REQUIRED_CHECK =
            "'MEMBER','CHILD','ADHERENT','OCCASIONAL_VISITOR','VISITOR','PASTOR','LEADER'";

    private final DataSource dataSource;

    public PersonSchemaCompatibilityRunner(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection connection = dataSource.getConnection()) {
            String tableSql = personTableSql(connection);
            if (tableSql == null) {
                return;
            }
            ensureActiveColumn(connection);
            ensureStatusColumns(connection);
            normalizeChildStatus(connection);
            tableSql = personTableSql(connection);
            if (tableSql.contains("OCCASIONAL_VISITOR")) {
                return;
            }
            rebuildPersonsTable(connection);
        }
    }

    private String personTableSql(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery("""
                        select sql
                        from sqlite_master
                        where type = 'table' and name = 'persons'
                        """)) {
            return result.next() ? result.getString(1) : null;
        }
    }

    private void ensureActiveColumn(Connection connection) throws SQLException {
        if (columnExists(connection, "active")) {
            return;
        }
        try (Statement statement = connection.createStatement()) {
            statement.execute("ALTER TABLE persons ADD COLUMN active boolean not null default true");
        }
    }

    private void ensureStatusColumns(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            if (!columnExists(connection, "status")) {
                statement.execute("ALTER TABLE persons ADD COLUMN status varchar(255) not null default 'ACTIVE'");
                statement.execute("UPDATE persons SET status = CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END");
            } else {
                statement.execute("UPDATE persons SET status = CASE WHEN active THEN 'ACTIVE' ELSE 'INACTIVE' END "
                        + "WHERE status IS NULL OR status = ''");
            }
            if (!columnExists(connection, "status_changed_date")) {
                statement.execute("ALTER TABLE persons ADD COLUMN status_changed_date date");
            }
            if (!columnExists(connection, "status_details")) {
                statement.execute("ALTER TABLE persons ADD COLUMN status_details varchar(3000)");
            }
            if (!columnExists(connection, "status_photo_file_name")) {
                statement.execute("ALTER TABLE persons ADD COLUMN status_photo_file_name varchar(255)");
            }
            if (!columnExists(connection, "status_photo_content_type")) {
                statement.execute("ALTER TABLE persons ADD COLUMN status_photo_content_type varchar(255)");
            }
            if (!columnExists(connection, "status_photo_file_size")) {
                statement.execute("ALTER TABLE persons ADD COLUMN status_photo_file_size bigint");
            }
            if (!columnExists(connection, "status_photo_storage_path")) {
                statement.execute("ALTER TABLE persons ADD COLUMN status_photo_storage_path varchar(255)");
            }
        }
    }

    private void normalizeChildStatus(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("UPDATE persons SET active = 1, status = 'ACTIVE', status_changed_date = NULL, status_details = NULL "
                    + "WHERE member_type = 'CHILD' AND (active = 0 OR status = 'INACTIVE')");
        }
    }

    private boolean columnExists(Connection connection, String columnName) throws SQLException {
        try (Statement statement = connection.createStatement();
                ResultSet result = statement.executeQuery("PRAGMA table_info(persons)")) {
            while (result.next()) {
                if (columnName.equalsIgnoreCase(result.getString("name"))) {
                    return true;
                }
            }
            return false;
        }
    }

    private void rebuildPersonsTable(Connection connection) throws SQLException {
        boolean autoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys = OFF");
            statement.execute("ALTER TABLE persons RENAME TO persons_legacy_member_type");
            statement.execute("""
                    CREATE TABLE persons (
                        id integer,
                        address varchar(255),
                        active boolean not null default true,
                        birth_date date,
                        church_id bigint not null,
                        church_role varchar(255),
                        created_at timestamp not null,
                        description varchar(3000),
                        description_owner_username varchar(255),
                        description_private boolean not null default false,
                        email varchar(255),
                        first_name varchar(255) not null,
                        last_name varchar(255) not null,
                        member_type varchar(255) not null check (member_type in (
                            'MEMBER',
                            'CHILD',
                            'ADHERENT',
                            'OCCASIONAL_VISITOR',
                            'VISITOR',
                            'PASTOR',
                            'LEADER'
                        )),
                        phone varchar(255),
                        position varchar(255),
                        status varchar(255) not null default 'ACTIVE',
                        status_changed_date date,
                        status_details varchar(3000),
                        status_photo_content_type varchar(255),
                        status_photo_file_name varchar(255),
                        status_photo_file_size bigint,
                        status_photo_storage_path varchar(255),
                        updated_at timestamp not null,
                        primary key (id)
                    )
                    """);
            statement.execute("""
                    INSERT INTO persons (
                        id,
                        address,
                        active,
                        birth_date,
                        church_id,
                        church_role,
                        created_at,
                        description,
                        description_owner_username,
                        description_private,
                        email,
                        first_name,
                        last_name,
                        member_type,
                        phone,
                        position,
                        status,
                        status_changed_date,
                        status_details,
                        status_photo_content_type,
                        status_photo_file_name,
                        status_photo_file_size,
                        status_photo_storage_path,
                        updated_at
                    )
                    SELECT
                        id,
                        address,
                        active,
                        birth_date,
                        church_id,
                        church_role,
                        created_at,
                        description,
                        description_owner_username,
                        description_private,
                        email,
                        first_name,
                        last_name,
                        member_type,
                        phone,
                        position,
                        status,
                        status_changed_date,
                        status_details,
                        status_photo_content_type,
                        status_photo_file_name,
                        status_photo_file_size,
                        status_photo_storage_path,
                        updated_at
                    FROM persons_legacy_member_type
                    """);
            statement.execute("DROP TABLE persons_legacy_member_type");
            statement.execute("PRAGMA foreign_keys = ON");
            connection.commit();
        } catch (SQLException ex) {
            connection.rollback();
            throw ex;
        } finally {
            connection.setAutoCommit(autoCommit);
        }
    }
}
