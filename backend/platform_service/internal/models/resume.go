package models

import (
	"time"
)

type ResumeRecord struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	CandidateName   string    `json:"candidate_name"`
	CandidateAge    *int      `json:"candidate_age"`
	ExperienceYears string    `json:"experience_years"`
	FileURL         string    `json:"file_url"`
	Analysis        string    `json:"analysis"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

type UploadDatabaseResponse struct {
	ProcessedCount  int            `json:"processed_count"`
	SuccessfulCount int            `json:"successful_count"`
	FailedCount     int            `json:"failed_count"`
	Resumes         []ResumeRecord `json:"resumes"`
}

type MatchedCandidate struct {
	ResumeID      string `json:"resume_id"`
	CandidateName string `json:"candidate_name"`
	FileURL       string `json:"file_url"`
	MatchScore    int    `json:"match_score"`
	Reasoning     string `json:"reasoning"`
}

type MatchCandidatesResponse struct {
	Candidates []MatchedCandidate `json:"candidates"`
}

type DeepSeekAnalysisResponse struct {
	CandidateName   string `json:"candidate_name"`
	CandidateAge    *int   `json:"candidate_age"`
	ExperienceYears string `json:"experience_years"`
	Analysis        string `json:"analysis"`
}

type DeepSeekMatchResponse struct {
	Candidates []struct {
		ResumeID      string `json:"resume_id"`
		CandidateName string `json:"candidate_name"`
		FileURL       string `json:"file_url"`
		MatchScore    int    `json:"match_score"`
		Reasoning     string `json:"reasoning"`
	} `json:"candidates"`
}
