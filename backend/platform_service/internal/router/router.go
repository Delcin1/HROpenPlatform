package router

import (
	"PlatformService/internal/config"
	"PlatformService/internal/router/auth"
	"PlatformService/internal/router/company"
	"PlatformService/internal/router/cv"
	"PlatformService/internal/router/profile"
	"PlatformService/internal/service"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	slogchi "github.com/samber/slog-chi"
)

type servers struct {
	auth    auth.ServerInterface
	profile profile.ServerInterface
	company company.ServerInterface
	cv      cv.ServerInterface
}

type Handler struct {
	cfg     *config.Config
	log     *slog.Logger
	servers *servers
}

func NewHandler(cfg *config.Config, log *slog.Logger, services *service.Services) *Handler {
	return &Handler{
		cfg: cfg,
		log: log,
		servers: &servers{
			auth:    auth.NewServer(services),
			profile: profile.NewServer(services),
			company: company.NewServer(services),
			cv:      cv.NewServer(services),
		},
	}
}

func (h *Handler) Init() *chi.Mux {
	router := chi.NewRouter()
	slogchiConfig := slogchi.Config{
		WithRequestBody:    true,
		WithResponseBody:   true,
		WithRequestHeader:  true,
		WithResponseHeader: true,
		WithUserAgent:      true,
		WithRequestID:      true,
	}
	slogchiMW := slogchi.NewWithConfig(h.log.WithGroup("http"), slogchiConfig)
	router.Use(InitRequestMW(h.log))
	router.Use(MetricsMW)
	router.Use(middleware.Recoverer)
	router.Get("/ping", h.serviceHealth)

	auth.HandlerWithOptions(h.servers.auth, auth.ChiServerOptions{
		BaseURL: "/auth",
		Middlewares: []auth.MiddlewareFunc{
			slogchiMW,
		},
	})

	profile.HandlerWithOptions(h.servers.profile, profile.ChiServerOptions{
		BaseURL: "/profile",
		Middlewares: []profile.MiddlewareFunc{
			slogchiMW,
			AuthMiddleware(h.cfg),
		},
	})

	company.HandlerWithOptions(h.servers.company, company.ChiServerOptions{
		BaseURL: "/company",
		Middlewares: []company.MiddlewareFunc{
			slogchiMW,
			AuthMiddleware(h.cfg),
		},
	})

	cv.HandlerWithOptions(h.servers.cv, cv.ChiServerOptions{
		BaseURL: "/cv",
		Middlewares: []cv.MiddlewareFunc{
			slogchiMW,
			AuthMiddleware(h.cfg),
		},
	})

	return router
}

func (h *Handler) serviceHealth(w http.ResponseWriter, _ *http.Request) {
	msg := "pong"

	_, err := w.Write([]byte(msg))
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(err.Error()))
		h.log.Error("failed to write response", slog.Any("error", err))
		return
	}

	w.WriteHeader(http.StatusOK)
}
