# Modern Ministry


create deployment. 
 cd /Users/daniel_cerna/soft-ministry/app/modern-ministry
  ./packaging/build-macos-dmg.shl

Modern Spring Boot + Angular rewrite for the church administration application.

## Structure

- `backend` - Spring Boot REST API with JSON DTOs, JPA DAO layer, validation, and JWT bearer authentication.
- `frontend` - Angular standalone application using Angular Material and HTTP JSON APIs.
- `docs/tools_used.md` - third-party technologies, licenses, and commercial-use notes.

## Current Scope

The first implemented slices are `persons`, `groups`, and `events`:

- login endpoint returning a JWT token
- secured CRUD-style JSON endpoints
- Angular Material shell with login, navigation, and list/create/delete flows

The existing MVC/Thymeleaf modules can be migrated incrementally into the same shape:

`Controller -> DTO -> Service -> DAO/Repository`

## Local Development

Backend:

```bash
cd backend
mvn spring-boot:run
```

Datele locale sunt persistate implicit în SQLite:

```text
~/.modern-ministry/data/modern-ministry.sqlite
```

Poți schimba folderul de date cu:

```bash
MODERN_MINISTRY_DATA_DIR=/cale/catre/date mvn spring-boot:run
```

Pentru PostgreSQL:

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=postgres
```

Variabile suportate pentru profilul `postgres`:

- `DATABASE_URL`
- `DATABASE_USERNAME`
- `DATABASE_PASSWORD`

Frontend:

```bash
cd frontend
npm install
npm start
```

Default development login:

- user: `admin`
- password: `admin123`
