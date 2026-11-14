#!/bin/bash
# LOCAL TESTING ONLY: recreate the test database from the migrations.
set -e
cd "$(dirname "$0")/.."
DB=${DB:-termini_test}
run() { su postgres -c "psql -v ON_ERROR_STOP=1 -q $*"; }
pg_ctlcluster 16 main start 2>/dev/null || true
sleep 1
run "-c 'drop database if exists $DB'" postgres
run "-c 'create database $DB'" postgres
run "-c \"alter database $DB set search_path = public, extensions\"" postgres
for f in dev/local-setup.sql supabase/migrations/*.sql; do
  echo "applying $f"; su postgres -c "psql -v ON_ERROR_STOP=1 -q -d $DB" < "$f"
done
echo "database $DB ready"
