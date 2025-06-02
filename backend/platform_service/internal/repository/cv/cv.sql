-- name: GetCVByGUID :one
SELECT * FROM cv.cv WHERE guid = $1;

-- name: GetCVByUserGUID :one
SELECT * FROM cv.cv WHERE user_guid = $1 ORDER BY created_at DESC LIMIT 1;

-- name: CreateCV :one
INSERT INTO cv.cv (
    guid,
    user_guid,
    link
) VALUES (
    $1, $2, $3
) RETURNING *;

-- name: UpdateCV :one
UPDATE cv.cv 
SET 
    link = $1
WHERE guid = $2
RETURNING *;

-- name: DeleteCV :exec
DELETE FROM cv.cv WHERE guid = $1;

-- name: SaveCVLink :exec
INSERT INTO cv.cv (guid, user_guid, link, created_at, updated_at)
VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
ON CONFLICT (user_guid) DO UPDATE
SET link = $2, updated_at = NOW();

-- name: GetCVLink :one
SELECT link FROM cv.cv WHERE user_guid = $1 ORDER BY created_at DESC LIMIT 1;

-- name: DeleteCVLink :exec
DELETE FROM cv.cv WHERE user_guid = $1;

-- name: CreateResumeRecord :one
INSERT INTO cv.resume_database (user_id, candidate_name, candidate_age, experience_years, file_url, analysis)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetResumesByUserID :many
SELECT * FROM cv.resume_database
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: GetResumeByID :one
SELECT * FROM cv.resume_database
WHERE id = $1;

-- name: DeleteResumeRecord :exec
DELETE FROM cv.resume_database
WHERE id = $1 AND user_id = $2;

-- name: SearchResumesByUserID :many
SELECT * FROM cv.resume_database
WHERE user_id = $1 AND (
    to_tsvector('russian', analysis) @@ plainto_tsquery('russian', $2)
    OR candidate_name ILIKE '%' || $2 || '%'
)
ORDER BY created_at DESC
LIMIT $3 OFFSET $4; 