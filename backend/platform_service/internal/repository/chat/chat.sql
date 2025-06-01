-- name: CreateChat :one
INSERT INTO chat.chats (created_at, updated_at)
VALUES (NOW(), NOW())
RETURNING *;

-- name: AddUserToChat :exec
INSERT INTO chat.chat_users (chat_id, user_id)
VALUES ($1, $2);

-- name: GetChatByID :one
SELECT c.*, array_agg(cu.user_id) as users
FROM chat.chats c
JOIN chat.chat_users cu ON c.id = cu.chat_id
WHERE c.id = $1
GROUP BY c.id;

-- name: GetUserChats :many
SELECT c.*, array_agg(cu.user_id) as users
FROM chat.chats c
JOIN chat.chat_users cu ON c.id = cu.chat_id
WHERE c.id IN (
    SELECT cu2.chat_id
    FROM chat.chat_users cu2
    WHERE cu2.user_id = $1
)
GROUP BY c.id
ORDER BY c.updated_at DESC;

-- name: CreateMessage :one
INSERT INTO chat.messages (chat_id, user_id, text)
VALUES ($1, $2, $3)
RETURNING *;

-- name: GetChatMessages :many
SELECT *
FROM chat.messages
WHERE chat_id = $1
ORDER BY created_at ASC
LIMIT $2 OFFSET $3;

-- name: GetLastMessage :one
SELECT *
FROM chat.messages
WHERE chat_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: GetUnreadCount :one
SELECT COUNT(*)
FROM chat.messages m
WHERE m.chat_id = $1 AND m.user_id != $2 AND m.created_at > (
    SELECT COALESCE(MAX(created_at), '1970-01-01'::timestamp)
    FROM chat.messages
    WHERE chat_id = $1 AND user_id = $2
);

-- name: UpdateChatUpdatedAt :exec
UPDATE chat.chats
SET updated_at = NOW()
WHERE id = $1; 

-- name: GetChatByUsersIDs :one
SELECT *
FROM chat.chats
where id = (SELECT chat_id
			FROM chat.chat_users
			WHERE user_id IN ($1, $2)
			GROUP BY chat_id
			HAVING COUNT(DISTINCT user_id) = 2
			ORDER BY MAX(created_at) DESC
			LIMIT 1
			)
ORDER BY updated_at DESC
LIMIT 1
;