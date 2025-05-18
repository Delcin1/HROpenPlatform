-- name: GetSessions :many
select * from auth.sessions;

-- name: CreateSession :one
INSERT INTO auth.sessions (
    id,
    secret,
    user_guid,
    created,
    ip,
    user_agent,
    active,
    nonce
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
) RETURNING *;

-- name: GetSessionByID :one
SELECT * FROM auth.sessions WHERE id = $1;

-- name: InvalidateSession :exec
UPDATE auth.sessions SET active = false WHERE id = $1;

-- name: GetActiveSessionByUserGUID :one
SELECT * FROM auth.sessions 
WHERE user_guid = $1 AND active = true 
ORDER BY created DESC 
LIMIT 1;