-- name: GetCompanyByGUID :one
SELECT * FROM company.companies WHERE guid = $1;

-- name: GetCompanyByShortLink :one
SELECT * FROM company.companies WHERE short_link_name = $1;

-- name: CreateCompany :one
INSERT INTO company.companies (
    guid,
    name,
    description,
    email,
    phone,
    website,
    address,
    avatar,
    short_link_name
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
) RETURNING *;

-- name: UpdateCompany :one
UPDATE company.companies 
SET 
    name = $1,
    description = $2,
    email = $3,
    phone = $4,
    website = $5,
    address = $6,
    avatar = $7,
    short_link_name = $8
WHERE guid = $9
RETURNING *;

-- name: DeleteCompany :exec
DELETE FROM company.companies WHERE guid = $1;

-- name: GetProfileCompany :one
SELECT * FROM company.profile_company 
WHERE user_guid = $1 AND company_guid = $2;

-- name: CreateProfileCompany :one
INSERT INTO company.profile_company (
    guid,
    user_guid,
    company_guid,
    position,
    started_at,
    finished_at
) VALUES (
    $1, $2, $3, $4, $5, $6
) RETURNING *;

-- name: UpdateProfileCompany :exec
INSERT INTO company.profile_company (
    guid,
    user_guid,
    company_guid,
    position,
    started_at,
    finished_at
) VALUES (
    $1, $2, $3, $4, $5, $6
) ON CONFLICT (guid) DO UPDATE SET
    position = $4,
    finished_at = $6,
    started_at = $5
WHERE company.profile_company.guid = $1;

-- name: DeleteProfileCompany :exec
DELETE FROM company.profile_company 
WHERE user_guid = $1 AND company_guid = $2;

-- name: GetProfileCompanies :many
SELECT * FROM company.profile_company WHERE user_guid = $1;

-- name: SearchCompanies :many
SELECT * FROM company.companies 
WHERE name ILIKE '%' || $1 || '%'
LIMIT 10; 

-- name: DeleteExperience :exec
DELETE FROM company.profile_company 
WHERE user_guid = $1 AND guid = $2;