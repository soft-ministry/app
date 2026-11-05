#!/usr/bin/env python3
"""Reset the local development SQLite database with a fictional church demo."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from pathlib import Path
import os
import sqlite3


DB_PATH = Path(os.environ.get(
    "MODERN_MINISTRY_DEMO_DB",
    Path.home() / ".modern-ministry" / "data" / "modern-ministry.sqlite",
)).expanduser().resolve()

NOW = datetime.now().replace(microsecond=0).isoformat(sep=" ")
TODAY = date.today()

PEOPLE = [
    ("Daniel", "Popescu"), ("Andreea", "Popescu"), ("Mihai", "Ionescu"),
    ("Elena", "Ionescu"), ("Sorin", "Dumitrescu"), ("Roxana", "Dumitrescu"),
    ("Adrian", "Marin"), ("Oana", "Marin"), ("Cristian", "Stan"),
    ("Laura", "Stan"), ("Vlad", "Georgescu"), ("Diana", "Georgescu"),
    ("Radu", "Munteanu"), ("Ioana", "Munteanu"), ("Florin", "Rusu"),
    ("Alina", "Rusu"), ("Cătălin", "Toma"), ("Simona", "Toma"),
    ("Alexandru", "Nistor"), ("Bianca", "Nistor"), ("Tudor", "Petrescu"),
    ("Mara", "Petrescu"), ("Ștefan", "Vasilescu"), ("Irina", "Vasilescu"),
    ("Paul", "Enache"), ("Gabriela", "Enache"), ("Ionuț", "Stoica"),
    ("Nicoleta", "Stoica"), ("Robert", "Pavel"), ("Ana", "Pavel"),
    ("Darius", "Neagu"), ("Maria", "Neagu"), ("Nicolae", "Avram"),
    ("Lidia", "Avram"), ("Marius", "Barbu"), ("Corina", "Barbu"),
    ("David", "Cernat"), ("Sara", "Cernat"), ("Matei", "Drăgan"),
    ("Eva", "Drăgan"), ("George", "Oprea"), ("Mihaela", "Oprea"),
    ("Victor", "Păun"), ("Monica", "Păun"), ("Lucian", "Badea"),
    ("Camelia", "Badea"), ("Bogdan", "Sandu"), ("Năstăsie", "Sandu"),
    ("Emanuel", "Mocanu"), ("Rebeca", "Mocanu"), ("Iulian", "Dobre"),
    ("Flavia", "Dobre"), ("Ciprian", "Lupu"), ("Adela", "Lupu"),
    ("Octavian", "Cristea"), ("Nadia", "Cristea"), ("Sebastian", "Ilie"),
    ("Denisa", "Ilie"), ("Rareș", "Bălan"), ("Daria", "Bălan"),
    ("Marcel", "Voicu"), ("Iulia", "Voicu"), ("Cezar", "Manea"),
    ("Teodora", "Manea"), ("Andrei", "Olteanu"), ("Ilinca", "Olteanu"),
    ("Sergiu", "Pătrașcu"), ("Mădălina", "Pătrașcu"), ("Tiberiu", "Coman"),
    ("Sonia", "Coman"),
]

ADDRESSES = [
    "Str. Luminii 12", "Str. Speranței 7", "Str. Viitorului 24",
    "Str. Măslinului 18", "Str. Păcii 31", "Str. Izvorului 9",
    "Str. Florilor 44", "Str. Livezilor 16", "Str. Tineretului 5",
    "Str. Cireșului 28",
]

FAMILY_NAMES = [
    "Popescu", "Ionescu", "Dumitrescu", "Marin", "Stan", "Georgescu",
    "Munteanu", "Rusu", "Toma", "Nistor", "Petrescu", "Vasilescu",
    "Enache", "Stoica", "Pavel", "Neagu", "Avram", "Barbu",
]

GROUPS = [
    (1, "Echipa pastorală și de ucenicie", "MINISTRY", "Coordonează îngrijirea spirituală, vizitele și formarea liderilor.", 1, [1, 3, 5, 7, 9]),
    (2, "Corul Betania", "MINISTRY", "Slujire prin cântare la serviciile divine și la evenimentele speciale.", 5, [2, 10, 11, 12, 13, 14, 15, 16, 17, 18]),
    (3, "Tineret Impact", "MINISTRY", "Comunitate pentru adolescenți și tineri adulți, cu întâlniri săptămânale.", 6, list(range(19, 33))),
    (4, "Grup de rugăciune Maranata", "SMALL_GROUP", "Rugăciune, mijlocire și părtășie în fiecare miercuri seară.", 3, list(range(33, 43))),
    (5, "Studiu biblic pentru adulți", "SMALL_GROUP", "Studiu biblic aplicat și discuții în grup restrâns.", 4, [1, 2, 3, 4] + list(range(43, 53))),
    (6, "Echipa media", "TEAM", "Sunet, proiecție, streaming și comunicare online.", 7, list(range(53, 59))),
    (7, "Diaconie și ajutorare", "MINISTRY", "Sprijin practic pentru familii, vârstnici și persoane în nevoie.", 8, list(range(59, 66))),
    (8, "Școala duminicală", "CLASS", "Clase biblice pentru copii și coordonarea voluntarilor.", 9, [12, 14, 16] + list(range(66, 71))),
]


def iso_date(year: int, month: int, day: int) -> str:
    return f"{year:04d}-{month:02d}-{day:02d} 00:00:00.0"


def db_date(value: date) -> str:
    return f"{value.isoformat()} 00:00:00.0"


def db_time(value: str) -> str:
    return f"1970-01-01 {value}:00.0"


def event_status(event_date: date) -> str:
    return "DONE" if event_date < TODAY else "PLANNED"


def create_people(connection: sqlite3.Connection) -> None:
    rows = []
    for person_id, (first_name, last_name) in enumerate(PEOPLE, start=1):
        if person_id in (1, 3):
            member_type, church_role, position = "PASTOR", "PASTOR", "Pastor principal" if person_id == 1 else "Pastor asistent"
        elif person_id in (5, 6, 7, 8, 9):
            member_type, church_role, position = "LEADER", "LEADER", "Coordonator de slujire"
        elif person_id >= 66:
            member_type, church_role, position = "CHILD", "MEMBER", "Participant Școala duminicală"
        elif person_id in (19, 20, 21, 22, 23, 24):
            member_type, church_role, position = "ADHERENT", "MEMBER", "Tânăr în formare"
        else:
            member_type, church_role, position = "MEMBER", "MEMBER", "Membru activ"

        birth_year = 1960 + ((person_id * 7) % 38)
        birth_month = 1 + ((person_id * 3) % 12)
        birth_day = 1 + ((person_id * 5) % 25)
        email = f"{first_name.lower().replace('ă', 'a').replace('ș', 's')}.{last_name.lower().replace('ă', 'a').replace('ș', 's')}{person_id}@demo-betania.ro"
        phone = f"+40 721 4{person_id:03d} {((person_id * 37) % 10000):04d}"
        rows.append((
            person_id,
            ADDRESSES[(person_id - 1) % len(ADDRESSES)] + ", București",
            iso_date(birth_year, birth_month, birth_day),
            1,
            church_role,
            NOW,
            email,
            first_name,
            last_name,
            member_type,
            phone,
            position,
            NOW,
            "Date fictive pentru demonstrație",
            None,
            0,
            1,
            None,
            None,
            None,
            None,
            None,
            None,
            "ACTIVE",
        ))
    connection.executemany(
        """INSERT INTO persons(
            id,address,birth_date,church_id,church_role,created_at,email,first_name,last_name,
            member_type,phone,position,updated_at,description,description_owner_username,
            description_private,active,status_changed_date,status_details,status_photo_content_type,
            status_photo_file_name,status_photo_file_size,status_photo_storage_path,status
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        rows,
    )


def create_families(connection: sqlite3.Connection) -> None:
    for family_id, family_name in enumerate(FAMILY_NAMES, start=1):
        connection.execute(
            "INSERT INTO families(id,church_id,created_at,name,notes,updated_at) VALUES (?,?,?,?,?,?)",
            (family_id, 1, NOW, f"Familia {family_name}", "Familie fictivă pentru demonstrație.", NOW),
        )

        husband_id = (family_id - 1) * 2 + 1
        wife_id = husband_id + 1
        connection.executemany(
            "INSERT INTO family_members(family_id,person_id,primary_member,role) VALUES (?,?,?,?)",
            [(family_id, husband_id, 1, "HUSBAND"), (family_id, wife_id, 0, "WIFE")],
        )
        connection.execute(
            "INSERT INTO family_relationships(family_id,person_a_id,person_b_id,type) VALUES (?,?,?,?)",
            (family_id, husband_id, wife_id, "SPOUSE"),
        )

    for child_id, family_id in zip(range(37, 49), range(1, 13)):
        connection.execute(
            "INSERT INTO family_members(family_id,person_id,primary_member,role) VALUES (?,?,?,?)",
            (family_id, child_id, 0, "CHILD"),
        )
        parent_id = (family_id - 1) * 2 + 1
        connection.execute(
            "INSERT INTO family_relationships(family_id,person_a_id,person_b_id,type) VALUES (?,?,?,?)",
            (family_id, parent_id, child_id, "PARENT_CHILD"),
        )


def create_groups(connection: sqlite3.Connection) -> None:
    for group_id, name, group_type, description, leader_id, member_ids in GROUPS:
        connection.execute(
            """INSERT INTO church_groups(
                id,church_id,created_at,description,name,type,updated_at,leader_id,whatsapp_link
            ) VALUES (?,?,?,?,?,?,?,?,?)""",
            (group_id, 1, NOW, description, name, group_type, NOW, leader_id, None),
        )
        connection.executemany(
            "INSERT INTO church_group_members(group_id,person_id) VALUES (?,?)",
            [(group_id, person_id) for person_id in sorted(set(member_ids))],
        )


def create_event(connection: sqlite3.Connection, event_id: int, name: str, about: str, event_date: date,
                 event_type: str, group_id: int | None, leader_id: int, time: str,
                 priority: str = "MEDIUM", recurrence: str = "NONE", end_date: date | None = None,
                 status: str | None = None) -> None:
    connection.execute(
        """INSERT INTO events(
            id,about,church_id,created_at,deleted,end_date,event_name,event_type,open_date,priority,
            recurrence_type,status,updated_at,group_id,implemented_by_id,event_session,event_time,
            about_owner_username,about_private,contacted_person_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (
            event_id, about, 1, NOW, 0, db_date(end_date or event_date), name, event_type,
            db_date(event_date), priority, recurrence, status or event_status(event_date), NOW,
            group_id, leader_id, None, db_time(time), None, 0, None,
        ),
    )
    connection.execute(
        "INSERT INTO event_responsibles(event_id,person_id) VALUES (?,?)",
        (event_id, leader_id),
    )


def create_events(connection: sqlite3.Connection) -> int:
    event_id = 1
    start_sunday = date(2026, 9, 6)
    for week in range(16):
        event_date = start_sunday + timedelta(days=week * 7)
        create_event(
            connection, event_id,
            f"Serviciu divin de duminică · {event_date.strftime('%d.%m.%Y')}",
            "Închinare, predică biblică, rugăciune și părtășie pentru întreaga biserică.",
            event_date, "ACT_DE_CULT", 1, 1, "10:00", "HIGH_MEDIUM", "WEEKLY",
        )
        event_id += 1

    start_wednesday = date(2026, 9, 9)
    for week in range(12):
        event_date = start_wednesday + timedelta(days=week * 7)
        create_event(
            connection, event_id,
            f"Seară de rugăciune și mijlocire · {event_date.strftime('%d.%m.%Y')}",
            "Mijlocire pentru familii, comunitate, misiune și nevoile bisericii.",
            event_date, "ACT_DE_CULT", 4, 3, "19:00", "MEDIUM", "WEEKLY",
        )
        event_id += 1

    special_events = [
        ("2026-10-31", "Seară de evanghelizare în comunitate", "Vestirea Evangheliei prin mărturii, muzică și conversații cu vecinii.", "EVANGELISM", 7, 8, "17:00", "HIGH"),
        ("2026-11-01", "Cina Domnului", "Serviciu special de comemorare, mulțumire și cercetare spirituală.", "ACT_DE_CULT", 1, 1, "10:00", "HIGH"),
        ("2026-11-06", "Întâlnire Tineret Impact", "Părtășie, devoțional și discuție despre credința trăită la școală și la serviciu.", "FELLOWSHIP", 3, 6, "19:00", "MEDIUM"),
        ("2026-11-08", "Botez nou-testamental", "Serviciu de botez și mărturii ale celor care aleg să-L urmeze pe Hristos.", "ACT_DE_CULT", 1, 3, "10:00", "HIGH"),
        ("2026-11-14", "Conferință pentru familii", "O zi de încurajare pentru căsnicii, părinți și copii, cu sesiuni practice.", "EVENT", 5, 4, "10:00", "HIGH"),
        ("2026-11-15", "Colectă pentru proiectul misionar", "Prezentarea proiectului și colectă dedicată susținerii unei lucrări sociale.", "ACT_DE_CULT", 7, 8, "10:00", "MEDIUM"),
        ("2026-11-21", "Acțiune de ajutorare pentru familii", "Pregătirea și distribuirea pachetelor alimentare pentru familii aflate în nevoie.", "SOCIAL_MEDIA_PUBLISHING", 7, 8, "09:00", "MEDIUM"),
        ("2026-11-28", "Atelier echipa media", "Planificare streaming, sunet, fotografii și comunicarea online a bisericii.", "IT", 6, 7, "10:00", "LOW"),
        ("2026-12-05", "Repetiție generală colinde", "Repetiție pentru programul de Crăciun și momentul coral al copiilor.", "MUSIC", 2, 5, "16:00", "MEDIUM"),
        ("2026-12-06", "Program de Crăciun pentru comunitate", "Program muzical și mesaj biblic deschis familiilor din cartier.", "EVENT", 2, 1, "17:00", "HIGH"),
        ("2026-12-13", "Serbare de Crăciun - Școala duminicală", "Copiii prezintă cântări, poezii și o scenetă despre Nașterea Domnului.", "EVENT", 8, 9, "16:00", "MEDIUM"),
        ("2026-12-19", "Seară de colinde și părtășie", "Colinde, ceai cald și invitați din comunitate.", "FELLOWSHIP", 2, 5, "18:00", "MEDIUM"),
        ("2026-12-31", "Serviciu de mulțumire la cumpăna dintre ani", "Privire retrospectivă, mulțumire și rugăciune pentru anul nou.", "ACT_DE_CULT", 1, 1, "19:00", "HIGH"),
        ("2027-01-10", "Duminica viziunii și a misiunii", "Prezentarea direcțiilor de slujire și a obiectivelor bisericii pentru anul nou.", "ACT_DE_CULT", 1, 1, "10:00", "HIGH"),
        ("2027-01-16", "Mic dejun pentru voluntari", "Recunoștință și planificare pentru echipele de slujire.", "FELLOWSHIP", 1, 5, "09:00", "LOW"),
        ("2027-01-24", "Săptămână de rugăciune - deschidere", "Prima seară dintr-o săptămână de rugăciune și post pentru biserică.", "ACT_DE_CULT", 4, 3, "18:00", "HIGH"),
        ("2027-02-06", "Curs de pregătire pentru lideri", "Principii de ucenicie, responsabilitate și îngrijire pastorală.", "STUDY", 1, 1, "10:00", "MEDIUM"),
        ("2027-02-14", "Seară pentru cupluri", "Părtășie și dialog despre comunicare, iertare și slujirea în familie.", "FELLOWSHIP", 5, 4, "18:00", "MEDIUM"),
        ("2027-02-27", "Târg caritabil pentru proiectul social", "Obiecte donate, produse pregătite de familii și strângere de fonduri pentru ajutorare.", "EVENT", 7, 8, "10:00", "MEDIUM"),
        ("2027-03-07", "Seară de mărturii și mulțumire", "Membrii împărtășesc răspunsuri la rugăciune și motive de recunoștință.", "ACT_DE_CULT", 1, 3, "18:00", "MEDIUM"),
    ]
    for row in special_events:
        event_date = date.fromisoformat(row[0])
        create_event(connection, event_id, row[1], row[2], event_date, row[3], row[4], row[5], row[6], row[7])
        event_id += 1

    connection.execute(
        "UPDATE events SET status='CANCELED' WHERE event_name='Întâlnire Tineret Impact'"
    )
    return event_id - 1


def create_attendance(connection: sqlite3.Connection) -> int:
    record_id = 1
    for week in range(8):
        attendance_date = date(2026, 9, 20) + timedelta(days=week * 7)
        for person_id in range(1, 46):
            status = "PRESENT" if ((person_id * 3 + week) % 7) not in (0, 1) else "ABSENT"
            connection.execute(
                """INSERT INTO attendance_records(
                    id,attendance_date,church_id,person_id,recorded_at,service_session,status,recorded_by
                ) VALUES (?,?,?,?,?,?,?,?)""",
                (record_id, db_date(attendance_date), 1, person_id, NOW, "MORNING", status, "admin"),
            )
            record_id += 1
    return record_id - 1


def create_finances(connection: sqlite3.Connection) -> int:
    rows = [
        (1, "Donații lunare", "INCOME", 4850.00, "Donații și zeciuieli pentru luna septembrie.", "2026-09-30"),
        (2, "Chirie spațiu activități", "EXPENSE", 1200.00, "Cost lunar pentru sala închiriată.", "2026-09-03"),
        (3, "Proiect misionar extern", "EXPENSE", 850.00, "Sprijin pentru lucrarea misionară.", "2026-09-08"),
        (4, "Donație pentru ajutorare", "INCOME", 1600.00, "Donație dedicată pachetelor sociale.", "2026-09-12"),
        (5, "Utilități și internet", "EXPENSE", 680.00, "Facturi lunare și conexiune pentru streaming.", "2026-09-15"),
        (6, "Materiale Școala duminicală", "EXPENSE", 420.00, "Manuale, materiale creative și rechizite.", "2026-09-19"),
        (7, "Donații lunare", "INCOME", 5120.00, "Donații și zeciuieli pentru luna octombrie.", "2026-10-25"),
        (8, "Reparații sistem audio", "EXPENSE", 980.00, "Revizie mixer, cabluri și microfoane.", "2026-10-07"),
        (9, "Pachete alimentare", "EXPENSE", 1125.00, "Ajutorare pentru 15 familii.", "2026-10-17"),
        (10, "Donație proiect tineret", "INCOME", 900.00, "Fond pentru retragerea anuală a tinerilor.", "2026-10-18"),
        (11, "Consumabile birou", "EXPENSE", 210.00, "Hârtie, toner și materiale administrative.", "2026-10-20"),
        (12, "Donație anonimă", "INCOME", 750.00, "Donație pentru fondul de urgență.", "2026-10-26"),
    ]
    for transaction_id, name, transaction_type, amount, description, transaction_date in rows:
        connection.execute(
            """INSERT INTO financial_transactions(
                id,amount,church_id,created_at,description,name,transaction_date,type,updated_at,
                amount_owner_username,amount_private
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (transaction_id, amount, 1, NOW, description, name, f"{transaction_date} 00:00:00.0", transaction_type, NOW, None, 0),
        )
    return len(rows)


def create_social_support(connection: sqlite3.Connection) -> int:
    rows = [
        (1, 37, 8, "FOOD", "ACTIVE_NEED", "Pachet alimentar lunar pentru o familie cu venit redus.", "HIGH", 180.00, 300.00, "2026-11-10"),
        (2, 42, 8, "MEDICAL", "UNDER_OBSERVATION", "Sprijin pentru costuri medicale și transport la tratament.", "URGENT", 750.00, 1000.00, "2026-11-05"),
        (3, 49, 7, "COUNSELING", "ACTIVE_NEED", "Întâlniri de consiliere și sprijin pentru reintegrare.", "MEDIUM", None, None, "2026-11-18"),
        (4, 55, 8, "FINANCIAL", "SUPPORTED", "Ajutor punctual pentru plata utilităților.", "MEDIUM", 250.00, 250.00, "2026-12-01"),
        (5, 61, 7, "HOUSING", "UNDER_OBSERVATION", "Evaluare pentru reparații urgente la locuință.", "HIGH", 1200.00, 1800.00, "2026-11-22"),
        (6, 68, 9, "SOCIAL", "RESOLVED", "Sprijin pentru integrarea unei familii noi în comunitate.", "LOW", 100.00, 100.00, "2026-10-30"),
    ]
    for case_id, person_id, assigned_to_id, need_type, status, summary, priority, estimated, approved, review_date in rows:
        connection.execute(
            """INSERT INTO social_support_cases(
                id,approved_amount,church_id,closed_at,created_at,estimated_amount,need_type,
                next_review_date,priority,private_notes,status,summary,updated_at,assigned_to_id,person_id
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (case_id, approved, 1, db_date(TODAY) if status == "RESOLVED" else None, NOW, estimated,
             need_type, f"{review_date} 00:00:00.0", priority, "Caz fictiv pentru demonstrație.", status, summary, NOW,
             assigned_to_id, person_id),
        )
    return len(rows)


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"Database not found: {DB_PATH}")

    connection = sqlite3.connect(DB_PATH)
    try:
        connection.execute("PRAGMA foreign_keys = OFF")
        connection.execute("BEGIN")

        for table in (
            "event_attachments", "event_contacted_persons", "event_responsibles",
            "event_private_descriptions", "person_private_descriptions", "attendance_records",
            "financial_transactions", "social_support_cases", "family_relationships",
            "family_members", "families", "church_group_members", "church_groups", "events",
            "persons", "churches",
        ):
            connection.execute(f"DELETE FROM {table}")

        connection.execute(
            """INSERT INTO churches(
                id,avatar_path,created_at,name,updated_at,address,contact_person,pastor_name,
                secretary_name,treasurer_name,denomination
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (1, None, NOW, "Biserica Creștină Betania", NOW, "Str. Speranței 10, București",
             "Andreea Popescu", "Daniel Popescu", "Elena Ionescu", "Sorin Dumitrescu",
             "Creștină Evanghelică"),
        )
        create_people(connection)
        create_families(connection)
        create_groups(connection)
        event_count = create_events(connection)
        attendance_count = create_attendance(connection)
        finance_count = create_finances(connection)
        social_count = create_social_support(connection)

        connection.execute(
            """INSERT INTO app_settings(setting_key,created_at,updated_at,setting_value)
               VALUES ('church.activeId',?,?,?)
               ON CONFLICT(setting_key) DO UPDATE SET updated_at=excluded.updated_at, setting_value=excluded.setting_value""",
            (NOW, NOW, "1"),
        )
        connection.execute(
            """INSERT INTO app_settings(setting_key,created_at,updated_at,setting_value)
               VALUES ('attendance.enabled',?,?,?)
               ON CONFLICT(setting_key) DO UPDATE SET updated_at=excluded.updated_at, setting_value=excluded.setting_value""",
            (NOW, NOW, "true"),
        )
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()

    print(f"Demo database created: {DB_PATH}")
    print(f"persons={len(PEOPLE)} families={len(FAMILY_NAMES)} groups={len(GROUPS)} events={event_count}")
    print(f"attendance_records={attendance_count} financial_transactions={finance_count} social_support_cases={social_count}")


if __name__ == "__main__":
    main()
