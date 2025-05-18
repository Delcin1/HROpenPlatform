package company

import (
	"PlatformService/internal/models"
	"PlatformService/internal/service"
	"encoding/json"
	"net/http"
)

type Server struct {
	services *service.Services
}

// CreateCompanyProfile implements ServerInterface.
func (s *Server) CreateCompanyProfile(w http.ResponseWriter, r *http.Request) {
	userGUID := r.Context().Value("user_guid").(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var company models.Company
	if err := json.NewDecoder(r.Body).Decode(&company); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	createdCompany, err := s.services.Company.CreateCompany(r.Context(), userGUID, &company)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(createdCompany)
}

// FetchCompany implements ServerInterface.
func (s *Server) FetchCompany(w http.ResponseWriter, r *http.Request, companyId string) {
	company, err := s.services.Company.GetCompany(r.Context(), companyId)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(company)
}

// UpdateCompanyProfile implements ServerInterface.
func (s *Server) UpdateCompanyProfile(w http.ResponseWriter, r *http.Request, companyId string) {
	userGUID := r.Context().Value("user_guid").(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var company models.Company
	if err := json.NewDecoder(r.Body).Decode(&company); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	updatedCompany, err := s.services.Company.UpdateCompany(r.Context(), userGUID, companyId, &company)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(updatedCompany)
}

// DeleteCompany implements ServerInterface.
func (s *Server) DeleteCompany(w http.ResponseWriter, r *http.Request, companyId string) {
	userGUID := r.Context().Value("user_guid").(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := s.services.Company.DeleteCompany(r.Context(), userGUID, companyId); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// SearchCompanyByName implements ServerInterface.
func (s *Server) SearchCompanyByName(w http.ResponseWriter, r *http.Request, params SearchCompanyByNameParams) {
	companies, err := s.services.Company.SearchCompanies(r.Context(), params.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(companies)
}

func NewServer(services *service.Services) ServerInterface {
	return &Server{services: services}
}
