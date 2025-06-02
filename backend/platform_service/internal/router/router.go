package router

import (
	"PlatformService/internal/config"
	"PlatformService/internal/router/auth"
	"PlatformService/internal/router/call"
	"PlatformService/internal/router/chat"
	"PlatformService/internal/router/company"
	"PlatformService/internal/router/cv"
	"PlatformService/internal/router/job"
	"PlatformService/internal/router/mw"
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
	chat    chat.ServerInterface
	call    call.ServerInterface
	job     job.ServerInterface
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
			auth:    auth.NewServer(services, log),
			profile: profile.NewServer(services, log),
			company: company.NewServer(services, log),
			cv:      cv.NewServer(services, log, cfg),
			chat:    chat.NewServer(services, log, cfg),
			call:    call.NewServer(services, log, cfg),
			job:     job.NewServer(services, log),
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
	router.Use(CORSMiddleware)
	router.Use(mw.InitRequestMW(h.log))
	router.Use(mw.MetricsMW)
	router.Use(middleware.Recoverer)
	router.Get("/ping", h.serviceHealth)

	auth.HandlerWithOptions(h.servers.auth, auth.ChiServerOptions{
		BaseRouter: router,
		Middlewares: []auth.MiddlewareFunc{
			slogchiMW,
			CORSMiddleware,
		},
	})

	profile.HandlerWithOptions(h.servers.profile, profile.ChiServerOptions{
		BaseRouter: router,
		Middlewares: []profile.MiddlewareFunc{
			slogchiMW,
			CORSMiddleware,
			mw.AuthMiddleware(h.cfg, h.log),
		},
	})

	company.HandlerWithOptions(h.servers.company, company.ChiServerOptions{
		BaseRouter: router,
		Middlewares: []company.MiddlewareFunc{
			slogchiMW,
			CORSMiddleware,
			mw.AuthMiddleware(h.cfg, h.log),
		},
	})

	cv.HandlerWithOptions(h.servers.cv, cv.ChiServerOptions{
		BaseRouter: router,
		Middlewares: []cv.MiddlewareFunc{
			slogchiMW,
			CORSMiddleware,
			mw.OptionalAuthMiddleware(h.cfg, h.log),
		},
	})

	chat.HandlerWithOptions(h.servers.chat, chat.ChiServerOptions{
		BaseRouter: router,
		Middlewares: []chat.MiddlewareFunc{
			slogchiMW,
			CORSMiddleware,
			mw.OptionalAuthMiddleware(h.cfg, h.log),
		},
	})

	call.HandlerWithOptions(h.servers.call, call.ChiServerOptions{
		BaseRouter: router,
		Middlewares: []call.MiddlewareFunc{
			slogchiMW,
			CORSMiddleware,
			mw.AuthMiddleware(h.cfg, h.log),
		},
	})

	job.HandlerWithOptions(h.servers.job, job.ChiServerOptions{
		BaseRouter: router,
		Middlewares: []job.MiddlewareFunc{
			slogchiMW,
			CORSMiddleware,
			mw.AuthMiddleware(h.cfg, h.log),
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
