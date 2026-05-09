# Local PostgreSQL Setup

## Context

The machine runs **PostgreSQL 18** installed via the EnterpriseDB installer (at `/Library/PostgreSQL/18`), not Homebrew. This is the instance the backend connects to.

---

## Steps to get the backend running after a fresh boot

### 1. Start PostgreSQL

PostgreSQL 18 does not auto-start. Run:

```bash
sudo -u postgres /Library/PostgreSQL/18/bin/pg_ctl start -D /Library/PostgreSQL/18/data
```

### 2. If the database doesn't exist yet

```bash
cd backend && npx prisma db push
```

That's it — the backend should start normally after these two steps.

---

## One-time setup (already done)

### Reset the postgres user password

`pg_hba.conf` used `scram-sha-256` auth. To reset the password when locked out:

1. Edit pg_hba.conf:
   ```bash
   sudo nano /Library/PostgreSQL/18/data/pg_hba.conf
   ```
2. Change all `scram-sha-256` to `trust`, save and exit.
3. Reload:
   ```bash
   sudo -u postgres /Library/PostgreSQL/18/bin/pg_ctl reload -D /Library/PostgreSQL/18/data
   ```
4. Reset password:
   ```bash
   sudo -u postgres /Library/PostgreSQL/18/bin/psql -U postgres -h 127.0.0.1 -c "ALTER USER postgres PASSWORD 'postgres';"
   ```
5. Revert `pg_hba.conf` back to `scram-sha-256` (or leave as `trust` for local dev — safe since it only listens on localhost).

### pg_hba.conf is currently set to `trust`

All auth methods are set to `trust`, meaning no password is required to connect from localhost. This is fine for local development.

---

## Connection details

| Field    | Value        |
|----------|--------------|
| Host     | localhost    |
| Port     | 5432         |
| Database | ai_reporter  |
| User     | postgres     |
| Password | postgres     |
