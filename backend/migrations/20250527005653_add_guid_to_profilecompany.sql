-- +goose Up
-- +goose StatementBegin
ALTER TABLE company.profile_company ADD COLUMN guid UUID NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE company.profile_company DROP CONSTRAINT profile_company_pkey;
ALTER TABLE company.profile_company ADD PRIMARY KEY (guid);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE company.profile_company DROP COLUMN guid;
ALTER TABLE company.profile_company ADD PRIMARY KEY (user_guid, company_guid);
-- +goose StatementEnd
