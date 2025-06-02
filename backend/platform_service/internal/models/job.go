package models

import "time"

type Job struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	CompanyName    string    `json:"company_name"`
	Location       string    `json:"location"`
	EmploymentType string    `json:"employment_type"`
	SalaryFrom     *int      `json:"salary_from"`
	SalaryTo       *int      `json:"salary_to"`
	Description    string    `json:"description"`
	Requirements   string    `json:"requirements"`
	AuthorID       string    `json:"author_id"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
	Status         string    `json:"status"`
}

type JobDetails struct {
	Job          Job              `json:"job"`
	IsAuthor     bool             `json:"is_author"`
	CanApply     bool             `json:"can_apply"`
	HasApplied   bool             `json:"has_applied"`
	Applications []JobApplication `json:"applications,omitempty"`
}

type JobWithApplications struct {
	Job               Job `json:"job"`
	ApplicationsCount int `json:"applications_count"`
}

type JobApplication struct {
	ID               string           `json:"id"`
	JobID            string           `json:"job_id"`
	ApplicantID      string           `json:"applicant_id"`
	ApplicantProfile ApplicantProfile `json:"applicant_profile"`
	AppliedAt        time.Time        `json:"applied_at"`
	Status           string           `json:"status"`
}

type ApplicantProfile struct {
	ID          string  `json:"id"`
	Description string  `json:"description"`
	Email       string  `json:"email"`
	Avatar      *string `json:"avatar"`
}

type ApplicationStatus struct {
	HasApplied    bool    `json:"has_applied"`
	ApplicationID *string `json:"application_id"`
	Status        *string `json:"status"`
}

type CreateJobRequest struct {
	Title          string `json:"title"`
	CompanyName    string `json:"company_name"`
	Location       string `json:"location"`
	EmploymentType string `json:"employment_type"`
	SalaryFrom     *int   `json:"salary_from"`
	SalaryTo       *int   `json:"salary_to"`
	Description    string `json:"description"`
	Requirements   string `json:"requirements"`
}

type UpdateJobRequest struct {
	Title          string `json:"title"`
	CompanyName    string `json:"company_name"`
	Location       string `json:"location"`
	EmploymentType string `json:"employment_type"`
	SalaryFrom     *int   `json:"salary_from"`
	SalaryTo       *int   `json:"salary_to"`
	Description    string `json:"description"`
	Requirements   string `json:"requirements"`
	Status         string `json:"status"`
}
