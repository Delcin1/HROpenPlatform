-- +goose Up
-- +goose StatementBegin

CREATE SCHEMA profile;

ALTER DEFAULT PRIVILEGES IN SCHEMA profile GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO backend;

CREATE SCHEMA cv;

ALTER DEFAULT PRIVILEGES IN SCHEMA cv GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO backend;

CREATE SCHEMA company;

ALTER DEFAULT PRIVILEGES IN SCHEMA company GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO backend;

CREATE TABLE profile.profiles (
    guid UUID PRIMARY KEY,
    is_hr boolean DEFAULT false,
    description character varying NOT NULL,
    email character varying UNIQUE NOT NULL,
    phone character varying,
    gender character varying NOT NULL,
    birthday character varying NOT NULL,
    avatar character varying,
    password_hash character varying NOT NULL,
    is_active boolean NOT NULL DEFAULT false,
    verification_token character varying,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
    updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text)
);

CREATE TABLE cv.cv (
    guid UUID PRIMARY KEY,
    user_guid character varying NOT NULL,
    link character varying NOT NULL,
    created_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
    updated_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text)
);

CREATE TABLE company.companies (
    guid UUID PRIMARY KEY,
    name character varying NOT NULL UNIQUE,
    description character varying,
    email character varying,
    phone character varying,
    website character varying,
    address character varying,
    avatar character varying,
    short_link_name character varying UNIQUE
);

CREATE TABLE company.profile_company (
    user_guid UUID NOT NULL,
    company_guid UUID NOT NULL REFERENCES company.companies (guid),
    position character varying NOT NULL,
    started_at timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text),
    finished_at timestamp without time zone,
    PRIMARY KEY (user_guid, company_guid)
);

CREATE SCHEMA auth;

ALTER DEFAULT PRIVILEGES IN SCHEMA auth GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO backend;

CREATE TABLE auth.sessions (
    id UUID NOT NULL,
    secret character varying NOT NULL,
    user_guid UUID NOT NULL,
    created timestamp without time zone NOT NULL,
    ip character varying NOT NULL,
    user_agent character varying NOT NULL,
    active boolean DEFAULT true,
    nonce character varying
); 

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

DROP SCHEMA profile CASCADE;
DROP SCHEMA auth CASCADE;
DROP SCHEMA cv CASCADE;
DROP SCHEMA company CASCADE;

-- +goose StatementEnd
