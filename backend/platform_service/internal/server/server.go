package server

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	config "PlatformService/internal/config"
	httprouter "PlatformService/internal/router"
)

type Server interface {
	Run() error
	Srv() *http.Server
	Stop() error
}

type server struct {
	srv *http.Server
	cfg *config.Config
	log *slog.Logger
}

func (s *server) Run() error {
	s.log.Info("server starting", slog.String("port", s.srv.Addr))
	return s.srv.ListenAndServe()
}

func prepare(cfg *config.Config, handlers *httprouter.Handler) *http.Server {
	router := handlers.Init()

	return &http.Server{
		Addr:              cfg.GetServerAddress(),
		ReadHeaderTimeout: time.Duration(cfg.HTTPReadHeaderTimeout) * time.Second,
		Handler:           router,
	}
}

func (s *server) Srv() *http.Server {
	return s.srv
}

func (s *server) Stop() error {
	return s.srv.Shutdown(context.Background())
}

func NewServer(cfg *config.Config, log *slog.Logger, handlers *httprouter.Handler) Server {
	srv := prepare(cfg, handlers)

	return &server{
		srv: srv,
		cfg: cfg,
		log: log,
	}
}
