package mw

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/VictoriaMetrics/metrics"

	"errors"

	"PlatformService/internal/config"
	"PlatformService/internal/service/auth"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
)

type (
	LogCtxKey string
	IDCtxkey  string
)

const (
	APITimeFormat  string    = "2006-01-02T15:04:05"
	APITimeFormatZ string    = "2006-01-02T15:04:05Z"
	LogKey         LogCtxKey = "log"
	UserIDKey      IDCtxkey  = "userId"
)

var ErrWrongAuthHeader = errors.New("malformed bearer token")

func GenerateState() string {
	uid := uuid.New()
	return uid.String()
}

// FindToken ищет и возвращает JWT токен.
func FindToken(r *http.Request) (string, error) {
	if authHeader := r.Header.Get("Authorization"); authHeader != "" {
		headParts := strings.Split(authHeader, "Bearer ")
		if len(headParts) != 2 { //nolint:mnd // Exactly 2 parts
			return ``, ErrWrongAuthHeader
		}
		return headParts[1], nil
	}
	return "", ErrWrongAuthHeader
}

func ParseData(body io.Reader, dest interface{}) error {
	// 1 - process incoming data (read / unmarshal)
	bdata, err := io.ReadAll(body)
	if err != nil {
		return fmt.Errorf("%w read request body", err)
	}

	if err = json.Unmarshal(bdata, dest); err != nil {
		return fmt.Errorf("%w unable to unmarshal telegram request body: byte_data=[%s]", err, string(bdata))
	}

	return nil
}

func MetricsMW(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)

		routePattern := chi.RouteContext(r.Context()).RoutePattern()
		code := ww.Status()
		bytesWritten := ww.BytesWritten()

		metricAttributes := fmt.Sprintf(`{pattern="%s",code="%d",method="%s"}`, routePattern, code, r.Method)
		counter := metrics.GetOrCreateCounter("requests" + metricAttributes)
		counter.Inc()
		responseDurationHistogram := metrics.GetOrCreateHistogram("response_duration" + metricAttributes)
		responseDurationHistogram.UpdateDuration(start)
		responseSizeHistogram := metrics.GetOrCreateHistogram("response_size" + metricAttributes)
		responseSizeHistogram.Update(float64(bytesWritten))
	})
}

func InitRequestMW(log *slog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		fn := func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			reqID := r.Header.Get("X-Request-Id")
			if reqID == "" {
				reqID = GenerateState()
			}

			ctxLog := log.With(slog.Group("http", slog.String("id", reqID)))
			ctx = context.WithValue(ctx, middleware.RequestIDKey, reqID)
			ctx = context.WithValue(ctx, LogKey, ctxLog)
			next.ServeHTTP(w, r.WithContext(ctx))

			err := ctx.Err()
			if err != nil {
				ctxLog.InfoContext(ctx, "request done with error", slog.Any("error", err))
			}
		}
		return http.HandlerFunc(fn)
	}
}

func AuthMiddleware(cfg *config.Config, log *slog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			token, err := FindToken(r)
			if err != nil {
				log.ErrorContext(ctx, "authMiddleware.FindToken failed to find token", "error", err)
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			claims, err := auth.ValidateToken(token, cfg.AccessTokenSecret)
			if err != nil {
				log.ErrorContext(ctx, "authMiddleware.ValidateToken failed to validate token", "error", err)
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			ctx = context.WithValue(ctx, UserIDKey, claims.UserGUID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
