package models

import "time"

type Chat struct {
	ID        string    `json:"id"`
	Users     []string  `json:"users"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Message struct {
	ID        string    `json:"id"`
	ChatID    string    `json:"chat_id"`
	UserID    string    `json:"user_id"`
	Text      string    `json:"text"`
	CreatedAt time.Time `json:"created_at"`
}

type ChatWithLastMessage struct {
	Chat        Chat     `json:"chat"`
	LastMessage *Message `json:"last_message,omitempty"`
	UnreadCount int      `json:"unread_count"`
}

type MessageAPI struct {
	ChatId    string      `json:"chat_id"`
	CreatedAt time.Time   `json:"created_at"`
	Id        string      `json:"id"`
	Text      string      `json:"text"`
	User      ChatUserAPI `json:"user"`
}

type ChatUserAPI struct {
	Avatar      *string `json:"avatar"`
	Description string  `json:"description"`
	Id          string  `json:"id"`
}
