-- name: CreateCall :one
INSERT INTO call.calls (created_at, status)
VALUES (NOW(), 'active')
RETURNING *;

-- name: AddParticipantToCall :exec
INSERT INTO call.call_participants (call_id, user_id)
VALUES ($1, $2);

-- name: GetCallByID :one
SELECT c.*, array_agg(cp.user_id) as participants
FROM call.calls c
JOIN call.call_participants cp ON c.id = cp.call_id
WHERE c.id = $1
GROUP BY c.id;

-- name: GetCallParticipants :many
SELECT cp.user_id, p.description, p.avatar
FROM call.call_participants cp
JOIN profile.profiles p ON cp.user_id = p.guid
WHERE cp.call_id = $1;

-- name: GetUserCalls :many
SELECT c.*, array_agg(cp.user_id) as participants
FROM call.calls c
JOIN call.call_participants cp ON c.id = cp.call_id
WHERE c.id IN (
    SELECT cp2.call_id
    FROM call.call_participants cp2
    WHERE cp2.user_id = $1
)
GROUP BY c.id
ORDER BY c.created_at DESC;

-- name: AddTranscript :one
INSERT INTO call.transcripts (call_id, user_id, text)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetCallTranscripts :many
SELECT t.*, p.description as user_description, p.avatar as user_avatar
FROM call.transcripts t
JOIN profile.profiles p ON t.user_id = p.guid
WHERE t.call_id = $1
ORDER BY t.timestamp ASC;

-- name: EndCall :exec
UPDATE call.calls
SET status = 'ended', ended_at = NOW()
WHERE id = $1;

-- name: UpdateParticipantLeftAt :exec
UPDATE call.call_participants
SET left_at = NOW()
WHERE call_id = $1 AND user_id = $2;

-- name: GetCallHistory :many
SELECT c.*, array_agg(cp.user_id) as participants
FROM call.calls c
JOIN call.call_participants cp ON c.id = cp.call_id
WHERE c.id IN (
    SELECT cp2.call_id
    FROM call.call_participants cp2
    WHERE cp2.user_id = $1
)
GROUP BY c.id
ORDER BY c.created_at DESC
LIMIT $2 OFFSET $3; 