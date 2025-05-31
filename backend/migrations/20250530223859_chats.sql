-- +goose Up
-- +goose StatementBegin
CREATE SCHEMA IF NOT EXISTS chat;

CREATE TABLE IF NOT EXISTS chat.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat.chat_users (
    chat_id UUID NOT NULL REFERENCES chat.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chat.chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON chat.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON chat.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_users_user_id ON chat.chat_users(user_id); 
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS chat.messages;
DROP TABLE IF EXISTS chat.chat_users;
DROP TABLE IF EXISTS chat.chats;
DROP SCHEMA IF EXISTS chat; 
-- +goose StatementEnd
