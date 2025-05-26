package cv

import (
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

// UploadCV implements ServerInterface.
func (s *Server) UploadCV(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Parse multipart form with 10MB max memory
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		s.log.ErrorContext(ctx, "cvServer.UploadCV failed to parse form", "error", err)
		http.Error(w, "Failed to parse form", http.StatusBadRequest)
		return
	}

	// Get file from form
	file, handler, err := r.FormFile("file")
	if err != nil {
		s.log.ErrorContext(ctx, "cvServer.UploadCV failed to retrieve file", "error", err)
		http.Error(w, "Error retrieving file", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Upload file to MinIO
	cvLink, err := s.services.Storage.UploadFile(r.Context(), file, handler.Filename)
	if err != nil {
		s.log.ErrorContext(ctx, "cvServer.UploadCV failed to upload file", "error", err)
		http.Error(w, "Failed to upload file", http.StatusInternalServerError)
		return
	}

	// Save CV link to database
	if err := s.services.CV.SaveCVLink(r.Context(), userGUID, cvLink); err != nil {
		s.log.ErrorContext(ctx, "cvServer.UploadCV failed to save CV link", "error", err)
		http.Error(w, "Failed to save CV link", http.StatusInternalServerError)
		return
	}

	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{
		"link": cvLink,
	})
}

func NewServer(services *service.Services, log *slog.Logger) ServerInterface {
	return &Server{
		services: services,
		log:      log,
	}
}
