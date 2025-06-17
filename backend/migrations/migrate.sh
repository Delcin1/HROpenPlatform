#!/bin/sh

set -e

echo "Waiting for PostgreSQL to be ready..."
while ! pg_isready -h $DB_HOST -p $DB_PORT -U postgres; do
  echo "PostgreSQL is not ready yet. Waiting..."
  sleep 2
done

echo "PostgreSQL is ready. Creating database and user if not exists..."

# Create database if it doesn't exist
PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U postgres -c "CREATE DATABASE $DB_NAME;"

# Create backend role if it doesn't exist
PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U postgres -c "DO \$\$ BEGIN CREATE ROLE backend WITH LOGIN PASSWORD 'your_password'; EXCEPTION WHEN duplicate_object THEN RAISE NOTICE 'Role backend already exists'; END \$\$;"

# Grant permissions to backend role
PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U postgres -c "GRANT CONNECT ON DATABASE $DB_NAME TO backend;"
PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON SCHEMA public TO backend;"
PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO backend;"
PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO backend;"
PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO backend;"
PGPASSWORD=postgres psql -h $DB_HOST -p $DB_PORT -U postgres -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO backend;"

echo "Running migrations..."
goose -dir /migrations postgres "host=$DB_HOST port=$DB_PORT user=postgres password=postgres dbname=$DB_NAME sslmode=$DB_SSLMODE" up

echo "Migrations completed successfully!"
