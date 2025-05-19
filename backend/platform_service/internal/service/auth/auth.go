package auth

import (
	"PlatformService/internal/config"
	"PlatformService/internal/models"
	"PlatformService/internal/repository"
	repository_auth "PlatformService/internal/repository/auth"
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
)

type Service interface {
	Login(ctx context.Context, userGUID string, ip, userAgent string) (*models.AuthTokens, error)
	Logout(ctx context.Context, token string) error
	Refresh(ctx context.Context, refreshToken string) (*models.AuthTokens, error)
}

type service struct {
	cfg  *config.Config
	repo *repository.Repositories
}

func (s *service) Login(ctx context.Context, userGUID string, ip, userAgent string) (*models.AuthTokens, error) {
	accessToken, err := generateToken(userGUID, s.cfg.AccessTokenSecret, s.cfg.AccessTokenTTL)
	if err != nil {
		return nil, err
	}
	refreshToken, err := generateToken(userGUID, s.cfg.RefreshTokenSecret, s.cfg.RefreshTokenTTL)
	if err != nil {
		return nil, err
	}

	// Store session in DB using transaction
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		sessionID := uuid.New()
		userGUIDUUID, err := uuid.Parse(userGUID)
		if err != nil {
			return err
		}
		_, err = s.repo.Auth.CreateSession(ctx, tx, repository_auth.CreateSessionParams{
			ID:        sessionID,
			Secret:    refreshToken,
			UserGuid:  userGUIDUUID,
			Created:   time.Now().UTC(),
			Ip:        ip,
			UserAgent: userAgent,
			Active:    sql.NullBool{Bool: true, Valid: true},
			Nonce:     sql.NullString{Valid: false},
		})
		return err
	})
	if err != nil {
		return nil, err
	}

	return &models.AuthTokens{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    s.cfg.AccessTokenTTL,
	}, nil
}

func (s *service) Logout(ctx context.Context, token string) error {
	claims, err := ValidateToken(token, s.cfg.AccessTokenSecret)
	if err != nil {
		return err
	}

	userGUIDUUID, err := uuid.Parse(claims.UserGUID)
	if err != nil {
		return err
	}

	var session repository_auth.AuthSession
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		// Find active session for user
		var err error
		session, err = s.repo.Auth.GetActiveSessionByUserGUID(ctx, tx, userGUIDUUID)
		if err != nil {
			return err
		}
		// Invalidate session
		return s.repo.Auth.InvalidateSession(ctx, tx, session.ID)
	})
	return err
}

func (s *service) Refresh(ctx context.Context, refreshToken string) (*models.AuthTokens, error) {
	claims, err := ValidateToken(refreshToken, s.cfg.RefreshTokenSecret)
	if err != nil {
		return nil, err
	}

	userGUIDUUID, err := uuid.Parse(claims.UserGUID)
	if err != nil {
		return nil, err
	}

	var session repository_auth.AuthSession
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		// Check session is active and matches refresh token
		var err error
		session, err = s.repo.Auth.GetActiveSessionByUserGUID(ctx, tx, userGUIDUUID)
		return err
	})
	if err != nil {
		return nil, err
	}

	if session.Secret != refreshToken {
		return nil, errors.New("invalid refresh token")
	}

	accessToken, err := generateToken(claims.UserGUID, s.cfg.AccessTokenSecret, s.cfg.AccessTokenTTL)
	if err != nil {
		return nil, err
	}

	return &models.AuthTokens{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    s.cfg.AccessTokenTTL,
	}, nil
}

func NewService(cfg *config.Config, repo *repository.Repositories) Service {
	return &service{
		cfg:  cfg,
		repo: repo,
	}
}
