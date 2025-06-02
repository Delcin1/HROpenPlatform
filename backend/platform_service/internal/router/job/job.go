package job

import (
	"PlatformService/internal/models"
	"PlatformService/internal/router/mw"
	"PlatformService/internal/service"
	"encoding/json"
	"log/slog"
	"net/http"
)

type Server struct {
	services *service.Services
	log      *slog.Logger
}

func (s *Server) GetAllJobs(w http.ResponseWriter, r *http.Request, params GetAllJobsParams) {
	search := params.Search
	limit := 20
	offset := 0
	if params.Limit != nil {
		limit = *params.Limit
	}
	if params.Offset != nil {
		offset = *params.Offset
	}

	jobs, err := s.services.Job.GetAllJobs(r.Context(), search, limit, offset)
	if err != nil {
		s.log.ErrorContext(r.Context(), "Failed to get jobs", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(jobs)
}

func (s *Server) CreateJob(w http.ResponseWriter, r *http.Request) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.CreateJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	job, err := s.services.Job.CreateJob(r.Context(), userGUID, &req)
	if err != nil {
		s.log.ErrorContext(r.Context(), "Failed to create job", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(job)
}

func (s *Server) GetMyJobs(w http.ResponseWriter, r *http.Request, params GetMyJobsParams) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	limit := 20
	offset := 0
	if params.Limit != nil {
		limit = *params.Limit
	}
	if params.Offset != nil {
		offset = *params.Offset
	}

	jobs, err := s.services.Job.GetMyJobs(r.Context(), userGUID, limit, offset)
	if err != nil {
		s.log.ErrorContext(r.Context(), "Failed to get my jobs", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(jobs)
}

func (s *Server) GetJobById(w http.ResponseWriter, r *http.Request, jobId string) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	jobDetails, err := s.services.Job.GetJobByID(r.Context(), jobId, userGUID)
	if err != nil {
		s.log.ErrorContext(r.Context(), "Failed to get job", "error", err, "job_id", jobId)
		if err.Error() == "job not found" {
			http.Error(w, "Job not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(jobDetails)
}

func (s *Server) UpdateJob(w http.ResponseWriter, r *http.Request, jobId string) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req models.UpdateJobRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	job, err := s.services.Job.UpdateJob(r.Context(), jobId, userGUID, &req)
	if err != nil {
		s.log.ErrorContext(r.Context(), "Failed to update job", "error", err, "job_id", jobId)
		if err.Error() == "job not found or access denied" {
			http.Error(w, "Job not found or access denied", http.StatusNotFound)
			return
		}
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(job)
}

func (s *Server) DeleteJob(w http.ResponseWriter, r *http.Request, jobId string) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	err := s.services.Job.DeleteJob(r.Context(), jobId, userGUID)
	if err != nil {
		s.log.ErrorContext(r.Context(), "Failed to delete job", "error", err, "job_id", jobId)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (s *Server) ApplyToJob(w http.ResponseWriter, r *http.Request, jobId string) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	err := s.services.Job.ApplyToJob(r.Context(), jobId, userGUID)
	if err != nil {
		s.log.ErrorContext(r.Context(), "Failed to apply to job", "error", err, "job_id", jobId)
		switch err.Error() {
		case "job not found":
			http.Error(w, "Job not found", http.StatusNotFound)
		case "job is not active":
			http.Error(w, "Job is not active", http.StatusBadRequest)
		case "already applied to this job":
			http.Error(w, "Already applied to this job", http.StatusConflict)
		case "cannot apply to your own job":
			http.Error(w, "Cannot apply to your own job", http.StatusBadRequest)
		default:
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusCreated)
}

func (s *Server) GetApplicationStatus(w http.ResponseWriter, r *http.Request, jobId string) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	status, err := s.services.Job.GetApplicationStatus(r.Context(), jobId, userGUID)
	if err != nil {
		s.log.ErrorContext(r.Context(), "Failed to get application status", "error", err, "job_id", jobId)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(status)
}

func (s *Server) GetJobApplications(w http.ResponseWriter, r *http.Request, jobId string, params GetJobApplicationsParams) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	limit := 20
	offset := 0
	if params.Limit != nil {
		limit = *params.Limit
	}
	if params.Offset != nil {
		offset = *params.Offset
	}

	applications, err := s.services.Job.GetJobApplications(r.Context(), jobId, userGUID, limit, offset)
	if err != nil {
		s.log.ErrorContext(r.Context(), "Failed to get job applications", "error", err, "job_id", jobId)
		switch err.Error() {
		case "job not found":
			http.Error(w, "Job not found", http.StatusNotFound)
		case "access denied: not job author":
			http.Error(w, "Access denied", http.StatusForbidden)
		default:
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(applications)
}

func NewServer(services *service.Services, log *slog.Logger) ServerInterface {
	return &Server{services: services, log: log}
}
