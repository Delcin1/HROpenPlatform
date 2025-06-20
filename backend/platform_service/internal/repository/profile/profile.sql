-- name: GetProfileByGUID :one
SELECT * FROM profile.profiles WHERE guid = $1;

-- name: GetProfileByEmail :one
SELECT * FROM profile.profiles WHERE email = $1;

-- name: CreateProfile :one
INSERT INTO profile.profiles (
    guid,
    is_hr,
    description,
    email,
    phone,
    gender,
    birthday,
    avatar,
    password_hash,
    is_active,
    verification_token,
    created_at,
    updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
) RETURNING *;

-- name: UpdateProfile :one
UPDATE profile.profiles 
SET 
    is_hr = $1,
    description = $2,
    email = $3,
    phone = $4,
    gender = $5,
    birthday = $6,
    avatar = $7,
    password_hash = $8,
    is_active = $9,
    verification_token = $10,
    updated_at = $11
WHERE guid = $12
RETURNING *;

-- name: DeleteProfile :exec
DELETE FROM profile.profiles WHERE guid = $1;

-- name: GetProfileCompanies :many
SELECT * FROM company.profile_company WHERE user_guid = $1;

-- name: UpdateProfileCompany :one
UPDATE company.profile_company 
SET 
    position = $1,
    finished_at = $2
WHERE user_guid = $3 AND company_guid = $4
RETURNING *;

-- name: SearchProfiles :many
SELECT * FROM profile.profiles 
WHERE description ILIKE '%' || $1 || '%'
ORDER BY updated_at DESC; 