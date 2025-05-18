package auth

import (
	"PlatformService/internal/config"
	"PlatformService/internal/models"
	"PlatformService/internal/repository"
	repository_auth "PlatformService/internal/repository/auth"
	"PlatformService/internal/repository/user"
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"golang.org/x/crypto/bcrypt"
)

type Service interface {
	Login(ctx context.Context, email string, password string, ip, userAgent string) (*models.AuthTokens, error)
	Logout(ctx context.Context, token string) error
	Refresh(ctx context.Context, refreshToken string) (*models.AuthTokens, error)
	Restore(ctx context.Context, email string) error
}

type service struct {
	cfg  *config.Config
	repo *repository.Repositories
}

func (s *service) authenticateUser(email, password string) (string, error) {
	var userGUID string
	err := s.repo.TxManager.WithTransaction(context.Background(), func(ctx context.Context, tx pgx.Tx) error {
		usr, err := s.repo.User.GetUserByEmail(ctx, tx, email)
		if err != nil {
			return err
		}
		if !usr.IsActive {
			return errors.New("user is not active")
		}
		if err := bcrypt.CompareHashAndPassword([]byte(usr.PasswordHash), []byte(password)); err != nil {
			return errors.New("invalid credentials")
		}
		userGUID = usr.Guid.String()
		return nil
	})
	return userGUID, err
}

func (s *service) Login(ctx context.Context, email string, password string, ip, userAgent string) (*models.AuthTokens, error) {
	userGUID, err := s.authenticateUser(email, password)
	if err != nil {
		return nil, err
	}

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

func (s *service) Restore(ctx context.Context, email string) error {
	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		usr, err := s.repo.User.GetUserByEmail(ctx, tx, email)
		if err != nil {
			return err
		}

		// Generate verification token
		verificationToken := uuid.New().String()
		now := time.Now().UTC()

		// Update user with new verification token
		err = s.repo.User.UpdateVerificationToken(ctx, tx, user.UpdateVerificationTokenParams{
			VerificationToken: sql.NullString{String: verificationToken, Valid: true},
			Updated:           now,
			Guid:              usr.Guid,
		})
		if err != nil {
			return err
		}

		// TODO: Send email with password reset link
		// The link should contain the verification token and user's email
		// Example: https://your-domain.com/reset-password?token={verificationToken}&email={email}

		return nil
	})
}

func NewService(cfg *config.Config, repo *repository.Repositories) Service {
	return &service{
		cfg:  cfg,
		repo: repo,
	}
}
