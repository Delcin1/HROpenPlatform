package auth

import (
	"PlatformService/internal/service"
	"encoding/json"
	"net/http"
)

type Server struct {
	services *service.Services
}

// Login implements ServerInterface.
func (s *Server) Login(w http.ResponseWriter, r *http.Request) {
	var req ApiLogin
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Authenticate user
	userGUID, err := s.services.Profile.Authenticate(r.Context(), string(req.Email), req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	// Create session
	tokens, err := s.services.Auth.Login(r.Context(), userGUID, r.RemoteAddr, r.UserAgent())
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	resp := ApiLoginResp{
		AccessToken:  &tokens.AccessToken,
		RefreshToken: &tokens.RefreshToken,
		ExpiresIn:    &tokens.ExpiresIn,
		TokenType:    func() *ApiLoginRespTokenType { t := Bearer; return &t }(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// Logout implements ServerInterface.
func (s *Server) Logout(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	if token == "" {
		http.Error(w, "Authorization header required", http.StatusUnauthorized)
		return
	}

	if err := s.services.Auth.Logout(r.Context(), token); err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// Refresh implements ServerInterface.
func (s *Server) Refresh(w http.ResponseWriter, r *http.Request) {
	token := r.Header.Get("Authorization")
	if token == "" {
		http.Error(w, "Authorization header required", http.StatusUnauthorized)
		return
	}

	tokens, err := s.services.Auth.Refresh(r.Context(), token)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	resp := ApiLoginResp{
		AccessToken:  &tokens.AccessToken,
		RefreshToken: &tokens.RefreshToken,
		ExpiresIn:    &tokens.ExpiresIn,
		TokenType:    func() *ApiLoginRespTokenType { t := Bearer; return &t }(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// Register implements ServerInterface.
func (s *Server) Register(w http.ResponseWriter, r *http.Request) {
	var req ApiRegister
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Password != req.ConfirmPassword {
		http.Error(w, "Passwords do not match", http.StatusBadRequest)
		return
	}

	// Register user
	userGUID, err := s.services.Profile.Register(r.Context(), string(req.Email), req.Password)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Create session
	tokens, err := s.services.Auth.Login(r.Context(), userGUID, r.RemoteAddr, r.UserAgent())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	resp := ApiLoginResp{
		AccessToken:  &tokens.AccessToken,
		RefreshToken: &tokens.RefreshToken,
		ExpiresIn:    &tokens.ExpiresIn,
		TokenType:    func() *ApiLoginRespTokenType { t := Bearer; return &t }(),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// Restore implements ServerInterface.
func (s *Server) Restore(w http.ResponseWriter, r *http.Request) {
	var req ApiRestore
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := s.services.Profile.Restore(r.Context(), string(req.Email)); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func NewServer(services *service.Services) ServerInterface {
	return &Server{services: services}
}
