package main

import (
	"PlatformService/internal/config"
	"PlatformService/internal/repository"
	"PlatformService/internal/repository/client"
	"PlatformService/internal/server"
	"PlatformService/internal/service"
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"runtime"
	"syscall"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/jackc/pgx/v4"

	"github.com/jackc/pgx/v4/pgxpool"

	httprouter "PlatformService/internal/router"

	_ "github.com/lib/pq"
)

const (
	appVersion = "0.0.1"
)

type dbLogger struct {
	log *slog.Logger
}

func main() {
	cfg, err := config.NewConfig()
	if err != nil {
		panic(err)
	}
	cfg.AppVersion = appVersion

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	logger := initLogger(cfg)

	// init psql DB
	db, err := initDB(ctx, logger, cfg)
	if err != nil {
		logger.Error("migrations", "error", err)
		return
	}
	defer func() {
		db.Close()
	}()

	err = server.StartMonitoringPgxpool(ctx, db, cfg)
	if err != nil {
		logger.ErrorContext(ctx, "server.StartMonitoringPgxpool", "error", err)
		return
	}

	// init server
	monitoringSrv := server.NewMonitoringServer(logger, cfg)

	go func() {
		err = monitoringSrv.Run()
		if err != nil {
			logger.Error("monitoringSrv", "error", err)
			os.Exit(1)
		}
	}()

	pgClient := client.NewPostgresClient(db)

	repositories := repository.NewRepositories(cfg, pgClient)
	services, err := service.NewServices(cfg, repositories)
	if err != nil {
		logger.ErrorContext(ctx, "Failed to create services", "error", err)
		return
	}

	handlers := httprouter.NewHandler(cfg, logger, services)

	// init server
	srv := server.NewServer(cfg, logger, handlers)

	go func() {
		err = srv.Run()
		if err != nil {
			logger.Error("HTTP Server Run", "error", err)
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
	<-quit
	cancel()

	if err = srv.Stop(); err != nil {
		logger.Error("Server forced to shutdown:", "error", err)
	}
	if err = monitoringSrv.Stop(); err != nil {
		logger.Error("Monitoring server forced to shutdown:", "error", err)
	}

}

func initDB(ctx context.Context, log *slog.Logger, cfg *config.Config) (*pgxpool.Pool, error) {
	// init psql DB
	dbConfig, err := pgxpool.ParseConfig(cfg.GetDBConnString())
	if err != nil {
		log.ErrorContext(ctx, "pgxpool.Connect", "Unable to parse config", err)
		return nil, err
	}
	dbConfig.ConnConfig.Logger = &dbLogger{log: log.With(slog.String("service", "pgxpool"))}
	dbConfig.MaxConns = int32(max(4, runtime.NumCPU(), cfg.DBMaxConns)) //nolint:mnd,gosec // It is from docs
	dbConfig.MinConns = int32(max(1, cfg.DBMinConns))                   //nolint:gosec // It is from docs
	db, err := pgxpool.ConnectConfig(context.Background(), dbConfig)
	if err != nil {
		log.ErrorContext(ctx, "pgxpool.Connect", "error", err)
		return nil, err
	}
	if err = db.Ping(context.Background()); err != nil {
		log.ErrorContext(ctx, "pgxpool.Ping", "error", err)
		return nil, err
	}
	return db, nil
}

func initLogger(cfg *config.Config) *slog.Logger {
	logWritter := os.Stdout
	logger := slog.New(slog.NewJSONHandler(logWritter, nil))
	logger = logger.With("version", cfg.AppVersion)
	logger = logger.With("app", "backend")
	slog.SetDefault(logger)

	logger.Info("Starting")
	return logger
}

func (l *dbLogger) Log(ctx context.Context, _ pgx.LogLevel, msg string, data map[string]interface{}) {
	sqlStr, ok := data["sql"].(string)
	if !ok {
		return
	}

	if sqlStr == "begin isolation level read committed" || sqlStr == "commit" || sqlStr == "rollback" {
		return
	}

	httpRequestID, ok := ctx.Value(middleware.RequestIDKey).(string)
	if !ok {
		httpRequestID = "-"
	}

	attrs := []any{}
	data["args"] = fmt.Sprint(data["args"])
	for k, v := range data {
		attrs = append(attrs, slog.Any(k, v))
	}

	l.log.InfoContext(ctx,
		msg,
		slog.Group("http",
			slog.String("id", httpRequestID),
		),
		slog.Group("pgxpool", attrs...),
	)
}
