package company

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

// CreateCompanyProfile implements ServerInterface.
func (s *Server) CreateCompanyProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var company models.Company
	if err := json.NewDecoder(r.Body).Decode(&company); err != nil {
		s.log.ErrorContext(ctx, "companyServer.CreateCompanyProfile failed to decode company", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	createdCompany, err := s.services.Company.CreateCompany(r.Context(), userGUID, &company)
	if err != nil {
		s.log.ErrorContext(ctx, "companyServer.CreateCompanyProfile failed to create company", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdCompany)
}

// FetchCompany implements ServerInterface.
func (s *Server) FetchCompany(w http.ResponseWriter, r *http.Request, companyId string) {
	ctx := r.Context()
	company, err := s.services.Company.GetCompany(ctx, companyId)
	if err != nil {
		s.log.ErrorContext(ctx, "companyServer.FetchCompany failed to get company", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(company)
}

// UpdateCompanyProfile implements ServerInterface.
func (s *Server) UpdateCompanyProfile(w http.ResponseWriter, r *http.Request, companyId string) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var company models.Company
	if err := json.NewDecoder(r.Body).Decode(&company); err != nil {
		s.log.ErrorContext(ctx, "companyServer.UpdateCompanyProfile failed to decode company", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	updatedCompany, err := s.services.Company.UpdateCompany(r.Context(), userGUID, companyId, &company)
	if err != nil {
		s.log.ErrorContext(ctx, "companyServer.UpdateCompanyProfile failed to update company", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(updatedCompany)
}

// DeleteCompany implements ServerInterface.
func (s *Server) DeleteCompany(w http.ResponseWriter, r *http.Request, companyId string) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := s.services.Company.DeleteCompany(r.Context(), userGUID, companyId); err != nil {
		s.log.ErrorContext(ctx, "companyServer.DeleteCompany failed to delete company", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// SearchCompanyByName implements ServerInterface.
func (s *Server) SearchCompanyByName(w http.ResponseWriter, r *http.Request, params SearchCompanyByNameParams) {
	ctx := r.Context()
	companies, err := s.services.Company.SearchCompanies(ctx, *params.Name)
	if err != nil {
		s.log.ErrorContext(ctx, "companyServer.SearchCompanyByName failed to search companies", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(companies)
}

func NewServer(services *service.Services, log *slog.Logger) ServerInterface {
	return &Server{services: services, log: log}
}
