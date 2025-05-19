package profile

import (
	"PlatformService/internal/models"
	"PlatformService/internal/router/mw"
	"PlatformService/internal/service"
	"encoding/json"
	"net/http"
)

type Server struct {
	services *service.Services
}

// GetProfile implements ServerInterface.
func (s *Server) GetProfile(w http.ResponseWriter, r *http.Request) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	profile, err := s.services.Profile.GetProfile(r.Context(), userGUID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(profile)
}

// CreateProfile implements ServerInterface.
func (s *Server) CreateProfile(w http.ResponseWriter, r *http.Request) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var profile models.Profile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.services.Profile.CreateProfile(r.Context(), userGUID, &profile); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// UpdateProfile implements ServerInterface.
func (s *Server) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var profile models.Profile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.services.Profile.UpdateProfile(r.Context(), userGUID, &profile); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// DeleteProfile implements ServerInterface.
func (s *Server) DeleteProfile(w http.ResponseWriter, r *http.Request) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := s.services.Profile.DeleteProfile(r.Context(), userGUID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeleteOwnProfile implements ServerInterface.
func (s *Server) DeleteOwnProfile(w http.ResponseWriter, r *http.Request) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := s.services.Profile.DeleteProfile(r.Context(), userGUID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// FetchOwnExperience implements ServerInterface.
func (s *Server) FetchOwnExperience(w http.ResponseWriter, r *http.Request) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	experience, err := s.services.Company.GetExperience(r.Context(), userGUID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(experience)
}

// FetchOwnProfile implements ServerInterface.
func (s *Server) FetchOwnProfile(w http.ResponseWriter, r *http.Request) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	profile, err := s.services.Profile.GetProfile(r.Context(), userGUID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(profile)
}

// StoreOwnProfile implements ServerInterface.
func (s *Server) StoreOwnProfile(w http.ResponseWriter, r *http.Request) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var profile models.Profile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.services.Profile.UpdateProfile(r.Context(), userGUID, &profile); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// StoreOwnExperience implements ServerInterface.
func (s *Server) StoreOwnExperience(w http.ResponseWriter, r *http.Request) {
	userGUID := r.Context().Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var experience models.Experience
	if err := json.NewDecoder(r.Body).Decode(&experience); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.services.Company.UpdateExperience(r.Context(), userGUID, &experience); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// SearchProfileByDescription implements ServerInterface.
func (s *Server) SearchProfileByDescription(w http.ResponseWriter, r *http.Request, params SearchProfileByDescriptionParams) {
	profiles, err := s.services.Profile.SearchProfiles(r.Context(), params.Description)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(profiles)
}

func NewServer(services *service.Services) ServerInterface {
	return &Server{services: services}
}
