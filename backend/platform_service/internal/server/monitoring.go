package server

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	config "PlatformService/internal/config"

	"github.com/VictoriaMetrics/metrics"
	"github.com/jackc/pgx/v4/pgxpool"
)

type monitoringServer struct {
	srv *http.Server
	cfg *config.Config
	log *slog.Logger
}

func (s *monitoringServer) Run() error {
	if strings.HasPrefix(s.cfg.VictoriaMetricsPushURL, "http") {
		extraLabels := []string{
			`app="backend"`,
			fmt.Sprintf(`version="%s"`, s.cfg.AppVersion),
			fmt.Sprintf(`hostname="%s"`, os.Getenv("HOSTNAME")),
			s.cfg.VictoriaMetricsExtraLabels,
		}

		err := metrics.InitPush(
			s.cfg.VictoriaMetricsPushURL,
			time.Duration(s.cfg.VictoriaMetricsPushInterval)*time.Second,
			strings.Join(extraLabels, ","),
			true,
		)
		if err != nil {
			log.Fatal("can't init victoriametrics push", "error", err)
		}
	}
	s.log.Info("monitoring server starting", slog.String("port", s.srv.Addr))
	return s.srv.ListenAndServe()
}

func prepareMonitoring(cfg *config.Config) *http.Server {
	mux := http.NewServeMux()
	mux.HandleFunc("/metrics", func(w http.ResponseWriter, _ *http.Request) {
		metrics.WritePrometheus(w, true)
	})

	return &http.Server{
		Addr:              cfg.GetMonitoringAddress(),
		ReadHeaderTimeout: time.Duration(cfg.HTTPReadHeaderTimeout) * time.Second,

		Handler: mux,
	}
}

func (s *monitoringServer) Srv() *http.Server {
	return s.srv
}

func (s *monitoringServer) Stop() error {
	return s.srv.Shutdown(context.Background())
}

func NewMonitoringServer(log *slog.Logger, cfg *config.Config) Server {
	srv := prepareMonitoring(cfg)

	return &monitoringServer{
		srv: srv,
		cfg: cfg,
		log: log,
	}
}

func StartMonitoringPgxpool(ctx context.Context, db *pgxpool.Pool, cfg *config.Config) error {
	go func() {
		ticker := time.NewTicker(time.Duration(cfg.DatasyncParallelCnt) * time.Second)
		for {
			select {
			case <-ctx.Done():
				ticker.Stop()
				return
			case <-ticker.C:
				stat := db.Stat()
				metrics.GetOrCreateCounter("pgxpool_acquire_count").
					Set(uint64(stat.AcquireCount())) //nolint:gosec // no way to solve this
				metrics.GetOrCreateCounter("pgxpool_acquire_duration_ns").
					Set(uint64(stat.AcquireDuration().Nanoseconds())) //nolint:gosec // no way to solve this
				metrics.GetOrCreateCounter("pgxpool_total_conns").
					Set(uint64(stat.TotalConns())) //nolint:gosec // no way to solve this
				metrics.GetOrCreateCounter("pgxpool_idle_conns").
					Set(uint64(stat.IdleConns())) //nolint:gosec // no way to solve this
				metrics.GetOrCreateCounter("pgxpool_max_conns").
					Set(uint64(stat.MaxConns())) //nolint:gosec // no way to solve this
				metrics.GetOrCreateCounter("pgxpool_new_conns_count").
					Set(uint64(stat.NewConnsCount())) //nolint:gosec // no way to solve this
			}
		}
	}()
	return nil
}
