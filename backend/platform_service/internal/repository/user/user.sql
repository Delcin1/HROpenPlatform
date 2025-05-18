-- name: GetUserByEmail :one
SELECT * FROM auth.users WHERE email = $1;

-- name: GetUserByGUID :one
SELECT * FROM auth.users WHERE guid = $1;

-- name: CreateUser :one
INSERT INTO auth.users (
    guid,
    email,
    password_hash,
    created,
    updated,
    is_active,
    verification_token
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;

-- name: UpdateUserPassword :exec
UPDATE auth.users 
SET password_hash = $1, updated = $2 
WHERE guid = $3;

-- name: UpdateVerificationToken :exec
UPDATE auth.users 
SET verification_token = $1, updated = $2 
WHERE guid = $3;

-- name: ActivateUser :exec
UPDATE auth.users 
SET is_active = true, updated = $1 
WHERE guid = $2; 