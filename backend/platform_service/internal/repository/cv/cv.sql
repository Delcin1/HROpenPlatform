-- name: GetCVByGUID :one
SELECT * FROM cv.cv WHERE guid = $1;

-- name: GetCVByUserGUID :one
SELECT * FROM cv.cv WHERE user_guid = $1;

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