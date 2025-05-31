-- +goose Up
-- +goose StatementBegin

-- Grant usage on schemas
GRANT USAGE ON SCHEMA chat TO backend;

-- Grant privileges on tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA chat TO backend;

-- Grant privileges on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA chat TO backend;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Revoke privileges on sequences
REVOKE USAGE, SELECT ON ALL SEQUENCES IN SCHEMA chat FROM backend;

-- Revoke privileges on tables
REVOKE SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA chat FROM backend;

-- Revoke usage on schemas
REVOKE USAGE ON SCHEMA chat FROM backend;

-- +goose StatementEnd
