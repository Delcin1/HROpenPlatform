package models

import "time"

type Profile struct {
	Guid        string    `json:"guid"`
	IsHr        bool      `json:"is_hr"`
	Description string    `json:"description"`
	Phone       *string    `json:"phone"`
	Email       string    `json:"email"`
	Birthdate   string    `json:"birthdate"`
	Gender      string    `json:"gender"`
	Avatar      *string   `json:"avatar,omitempty"`
	Cv          *string   `json:"cv,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	CompanyName *string   `json:"company_name,omitempty"`
}

type Experience struct {
	CompanyName string  `json:"company_name"`
	Position    string  `json:"position"`
	StartDate   string  `json:"start_date"`
	EndDate     *string `json:"end_date,omitempty"`
	Guid        *string `json:"guid,omitempty"`
}

type ShortProfile struct {
	Guid        string    `json:"guid"`
	Description string    `json:"description"`
	IsHr        bool      `json:"is_hr"`
	CompanyName *string   `json:"company_name,omitempty"`
	UpdatedAt   time.Time `json:"updated_at"`
}
