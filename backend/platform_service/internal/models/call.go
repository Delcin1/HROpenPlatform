package models

import "time"

type CallStatus string

const (
	CallStatusActive CallStatus = "active"
	CallStatusEnded  CallStatus = "ended"
)

type CallParticipant struct {
	Id          string  `json:"id"`
	Description string  `json:"description"`
	Avatar      *string `json:"avatar,omitempty"`
}

type Call struct {
	Id           string            `json:"id"`
	Participants []CallParticipant `json:"participants"`
	CreatedAt    time.Time         `json:"created_at"`
	EndedAt      *time.Time        `json:"ended_at,omitempty"`
	Status       CallStatus        `json:"status"`
}

type TranscriptEntry struct {
	User      CallParticipant `json:"user"`
	Text      string          `json:"text"`
	Timestamp time.Time       `json:"timestamp"`
}

type CallWithTranscript struct {
	Call       Call              `json:"call"`
	Transcript []TranscriptEntry `json:"transcript"`
}
