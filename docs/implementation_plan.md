# Modern Ministry Implementation Plan

## Principii

- Migrare incrementală, modul cu modul.
- Fiecare modul trebuie să aibă flux complet în backend și frontend înainte de a trece la următorul.
- Structură backend: `Controller -> DTO -> Service -> DAO/Repository`.
- Comunicare frontend/backend prin JSON și bearer token.
- UI construit cu Angular Material și librării free/open-source potrivite pentru distribuție comercială.

## Pași

### 1. UX CRUD Complet

Scop: modulele existente să fie utilizabile, nu doar schelet tehnic.

- Persoane: creare, listare, editare, ștergere cu confirmare.
- Grupuri: creare, listare, editare, ștergere cu confirmare.
- Evenimente: creare, listare, editare, ștergere cu confirmare.
- Refolosire pattern de form state: `create` / `edit` / `cancel`.

### 2. Feedback Vizual Și Erori

- Snackbar pentru succes.
- Snackbar pentru erori API.
- Mesaj clar pentru sesiune expirată sau token invalid.
- Confirm dialog înainte de ștergere.

### 3. Auth Realist

- Entitate `User` în DB.
- Parole BCrypt persistate.
- Roluri de bază: `ADMIN`, `PASTOR`, `SECRETARY`, `LEADER`.
- Endpoint pentru utilizator curent.
- Pregătire pentru administrare utilizatori.

### 4. Relații Între Module

- Evenimente: selectare grup asociat.
- Evenimente: selectare responsabil din persoane.
- Grupuri: selectare lider.
- Grupuri: administrare membri.

### 5. Module Migrare Din Aplicația Veche

Ordine recomandată:

1. Prezență / attendance.
2. Vizite.
3. Finanțe.
4. Follow-up pastoral.
5. Setări și preferințe.

### 6. Pregătire Comercială

- Revizuire `tools_used.md` la fiecare librărie nouă.
- Generare raport licențe pentru Maven și npm înainte de release.
- Profil de producție cu PostgreSQL.
- Configurare build și packaging.
- Teste pentru fluxurile critice.

