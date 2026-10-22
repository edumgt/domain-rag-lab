# Project 3 database isolation

Project 2 continues to use the existing PostgreSQL database. Project 3 uses
`project3db`, the dedicated non-superuser role `project3_app`, separate ORM
metadata, a separate connection pool, and `get_project3_db` for every route.

Configure `PROJECT3_POSTGRES_DB`, `PROJECT3_POSTGRES_USER`, and
`PROJECT3_POSTGRES_PASSWORD` in the deployment environment. Never commit the
password. Missing credentials or reuse of the shared database/role fails closed.

At API startup, after the previous container has stopped accepting writes,
`initialize_project3_database` copies only the four legacy Project 3 tables.
The copy, sequences, and completion marker commit atomically in the new DB.
An advisory lock serializes concurrent initialization. Later restarts see the
completion marker and do not import legacy rows again. A nonempty destination
without a marker requires explicit reconciliation rather than overwriting data.

Legacy Project 3 tables remain untouched in the original database for rollback;
application Project 3 requests no longer use them. Project 2 records are never
copied into the new database. Backups of the original presentation records are
stored privately on the deployment host before cutover.

Verified on 2026-10-22: all legacy Project 3 rows matched the destination exactly,
the original database fingerprint was unchanged, migration reruns were idempotent,
and the Project 3 role was denied access to Project 2's survey table.
