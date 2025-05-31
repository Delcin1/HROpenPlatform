package profile

import (
	"PlatformService/internal/models"
	"PlatformService/internal/router/mw"
	"PlatformService/internal/service"
	"encoding/json"
	"errors"
	"github.com/jackc/pgx/v4"
	"log/slog"
	"net/http"
)

type Server struct {
	services *service.Services
	log      *slog.Logger
}

// GetExperienceByGuid implements ServerInterface.
func (s *Server) GetExperienceByGuid(w http.ResponseWriter, r *http.Request, guid string) {
	ctx := r.Context()

	experience, err := s.services.Company.GetExperience(ctx, guid)
	if err != nil {
		s.log.ErrorContext(ctx, "profileServer.GetExperienceByGuid failed to get experience", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(experience)
}

// GetProfileByGuid implements ServerInterface.
func (s *Server) GetProfileByGuid(w http.ResponseWriter, r *http.Request, guid string) {
	ctx := r.Context()

	profile, err := s.services.Profile.GetProfile(ctx, guid)
	if err != nil {
		s.log.ErrorContext(ctx, "profileServer.GetProfileByGuid failed to get profile", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cvLink, err := s.services.CV.GetCVLink(ctx, guid)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		s.log.ErrorContext(ctx, "profileServer.GetProfileByGuid failed to get cv link", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if !errors.Is(err, pgx.ErrNoRows) {
		profile.Cv = &cvLink
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(profile)
}

// GetProfile implements ServerInterface.
func (s *Server) GetProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	profile, err := s.services.Profile.GetProfile(ctx, userGUID)
	if err != nil {
		s.log.ErrorContext(ctx, "profileServer.GetProfile failed to get profile", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cvLink, err := s.services.CV.GetCVLink(ctx, userGUID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		s.log.ErrorContext(ctx, "profileServer.GetProfile failed to get cv link", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		profile.Cv = &cvLink
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(profile)
}

// CreateProfile implements ServerInterface.
func (s *Server) CreateProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var profile models.Profile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		s.log.ErrorContext(ctx, "profileServer.CreateProfile failed to decode profile", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.services.Profile.CreateProfile(ctx, userGUID, &profile); err != nil {
		s.log.ErrorContext(ctx, "profileServer.CreateProfile failed to create profile", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// UpdateProfile implements ServerInterface.
func (s *Server) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var profile models.Profile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		s.log.ErrorContext(ctx, "profileServer.UpdateProfile failed to decode profile", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.services.Profile.UpdateProfile(ctx, userGUID, &profile); err != nil {
		s.log.ErrorContext(ctx, "profileServer.UpdateProfile failed to update profile", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if profile.Cv != nil {
		err := s.services.CV.SaveCVLink(ctx, userGUID, *profile.Cv)
		if err != nil {
			s.log.ErrorContext(ctx, "profileServer.UpdateProfile failed to save cv link", "error", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
	}
	w.WriteHeader(http.StatusOK)
}

// DeleteProfile implements ServerInterface.
func (s *Server) DeleteProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := s.services.Profile.DeleteProfile(ctx, userGUID); err != nil {
		s.log.ErrorContext(ctx, "profileServer.DeleteProfile failed to delete profile", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// DeleteOwnProfile implements ServerInterface.
func (s *Server) DeleteOwnProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := s.services.Profile.DeleteProfile(ctx, userGUID); err != nil {
		s.log.ErrorContext(ctx, "profileServer.DeleteOwnProfile failed to delete profile", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// FetchOwnExperience implements ServerInterface.
func (s *Server) FetchOwnExperience(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	experience, err := s.services.Company.GetExperience(ctx, userGUID)
	if err != nil {
		s.log.ErrorContext(ctx, "profileServer.FetchOwnExperience failed to get experience", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(experience)
}

// FetchOwnProfile implements ServerInterface.
func (s *Server) FetchOwnProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	profile, err := s.services.Profile.GetProfile(ctx, userGUID)
	if err != nil {
		s.log.ErrorContext(ctx, "profileServer.FetchOwnProfile failed to get profile", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	cvLink, err := s.services.CV.GetCVLink(ctx, userGUID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		s.log.ErrorContext(ctx, "profileServer.FetchOwnProfile failed to get cv link", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		profile.Cv = &cvLink
	}

	profile.Cv = &cvLink

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(profile)
}

// StoreOwnProfile implements ServerInterface.
func (s *Server) StoreOwnProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var profile models.Profile
	if err := json.NewDecoder(r.Body).Decode(&profile); err != nil {
		s.log.ErrorContext(ctx, "profileServer.StoreOwnProfile failed to decode profile", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.services.Profile.UpdateProfile(ctx, userGUID, &profile); err != nil {
		s.log.ErrorContext(ctx, "profileServer.StoreOwnProfile failed to update profile", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// StoreOwnExperience implements ServerInterface.
func (s *Server) StoreOwnExperience(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var experience models.Experience
	if err := json.NewDecoder(r.Body).Decode(&experience); err != nil {
		s.log.ErrorContext(ctx, "profileServer.StoreOwnExperience failed to decode experience", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.services.Company.UpdateExperience(ctx, userGUID, &experience); err != nil {
		s.log.ErrorContext(ctx, "profileServer.StoreOwnExperience failed to update experience", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// SearchProfileByDescription implements ServerInterface.
func (s *Server) SearchProfileByDescription(w http.ResponseWriter, r *http.Request, params SearchProfileByDescriptionParams) {
	ctx := r.Context()
	profiles, err := s.services.Profile.SearchProfiles(ctx, params.Description)
	if err != nil {
		s.log.ErrorContext(ctx, "profileServer.SearchProfileByDescription failed to search profiles", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	var resp ApiSearchProfileResp
	for _, profile := range profiles {
		resp.Profiles = append(resp.Profiles, ShortProfile{
			CompanyName: nil,
			Description: profile.Description,
			Guid:        profile.Guid,
			IsHr:        profile.IsHr,
			UpdatedAt:   profile.UpdatedAt,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// DeleteOwnExperience implements ServerInterface.
func (s *Server) DeleteOwnExperience(w http.ResponseWriter, r *http.Request, params DeleteOwnExperienceParams) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if err := s.services.Company.DeleteExperience(ctx, userGUID, params.Guid); err != nil {
		s.log.ErrorContext(ctx, "profileServer.DeleteOwnExperience failed to delete experience", "error", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func NewServer(services *service.Services, log *slog.Logger) ServerInterface {
	return &Server{services: services, log: log}
}
