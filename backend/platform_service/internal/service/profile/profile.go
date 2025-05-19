package profile

import (
	"PlatformService/internal/config"
	"PlatformService/internal/models"
	"PlatformService/internal/repository"
	repository_profile "PlatformService/internal/repository/profile"
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"golang.org/x/crypto/bcrypt"
)

type Service interface {
	GetProfile(ctx context.Context, userGUID string) (*models.Profile, error)
	CreateProfile(ctx context.Context, userGUID string, profile *models.Profile) error
	UpdateProfile(ctx context.Context, userGUID string, profile *models.Profile) error
	DeleteProfile(ctx context.Context, userGUID string) error
	SearchProfiles(ctx context.Context, description string) ([]models.ShortProfile, error)
	Authenticate(ctx context.Context, email string, password string) (string, error)
	Register(ctx context.Context, email string, password string) (string, error)
	Restore(ctx context.Context, email string) error
}

type service struct {
	cfg  *config.Config
	repo *repository.Repositories
}

func (s *service) GetProfile(ctx context.Context, userGUID string) (*models.Profile, error) {
	userGUIDUUID, err := uuid.Parse(userGUID)
	if err != nil {
		return nil, err
	}

	var profile repository_profile.ProfileProfile
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		profile, err = s.repo.Profile.GetProfileByGUID(ctx, tx, userGUIDUUID)
		return err
	})
	if err != nil {
		return nil, err
	}

	return &models.Profile{
		Guid:        profile.Guid.String(),
		IsHr:        profile.IsHr.Bool,
		Description: profile.Description,
		Phone: func() *string {
			if profile.Phone.Valid {
				return &profile.Phone.String
			} else {
				return nil
			}
		}(),
		Email:     profile.Email,
		Birthdate: profile.Birthday,
		Gender:    profile.Gender,
		Avatar:    &profile.Avatar.String,
		CreatedAt: profile.CreatedAt.Time,
		UpdatedAt: profile.UpdatedAt.Time,
	}, nil
}

func (s *service) CreateProfile(ctx context.Context, userGUID string, profile *models.Profile) error {
	userGUIDUUID, err := uuid.Parse(userGUID)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		_, err := s.repo.Profile.CreateProfile(ctx, tx, repository_profile.CreateProfileParams{
			Guid:        userGUIDUUID,
			IsHr:        sql.NullBool{Bool: profile.IsHr, Valid: true},
			Description: profile.Description,
			Email:       profile.Email,
			Phone: sql.NullString{String: func() string {
				if profile.Phone != nil {
					return *profile.Phone
				} else {
					return ""
				}
			}(), Valid: profile.Phone != nil},
			Gender:    profile.Gender,
			Birthday:  profile.Birthdate,
			Avatar:    sql.NullString{String: *profile.Avatar, Valid: profile.Avatar != nil},
			CreatedAt: sql.NullTime{Time: now, Valid: true},
			UpdatedAt: sql.NullTime{Time: now, Valid: true},
		})
		return err
	})
}

func (s *service) UpdateProfile(ctx context.Context, userGUID string, profile *models.Profile) error {
	userGUIDUUID, err := uuid.Parse(userGUID)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		_, err := s.repo.Profile.UpdateProfile(ctx, tx, repository_profile.UpdateProfileParams{
			Guid:        userGUIDUUID,
			IsHr:        sql.NullBool{Bool: profile.IsHr, Valid: true},
			Description: profile.Description,
			Email:       profile.Email,
			Phone: sql.NullString{String: func() string {
				if profile.Phone != nil {
					return *profile.Phone
				} else {
					return ""
				}
			}(), Valid: profile.Phone != nil},
			Gender:    profile.Gender,
			Birthday:  profile.Birthdate,
			Avatar:    sql.NullString{String: *profile.Avatar, Valid: profile.Avatar != nil},
			UpdatedAt: sql.NullTime{Time: now, Valid: true},
		})
		return err
	})
}

func (s *service) DeleteProfile(ctx context.Context, userGUID string) error {
	userGUIDUUID, err := uuid.Parse(userGUID)
	if err != nil {
		return err
	}

	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		return s.repo.Profile.DeleteProfile(ctx, tx, userGUIDUUID)
	})
}

func (s *service) SearchProfiles(ctx context.Context, description string) ([]models.ShortProfile, error) {
	var profiles []models.ShortProfile
	err := s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		results, err := s.repo.Profile.SearchProfiles(ctx, tx, sql.NullString{String: description, Valid: true})
		if err != nil {
			return err
		}

		for _, p := range results {
			profile := models.ShortProfile{
				Guid:        p.Guid.String(),
				Description: p.Description,
				IsHr:        p.IsHr.Bool,
				UpdatedAt:   p.UpdatedAt.Time,
			}
			profiles = append(profiles, profile)
		}
		return nil
	})

	return profiles, err
}

func (s *service) Authenticate(ctx context.Context, email string, password string) (string, error) {
	var userGUID string
	err := s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		profile, err := s.repo.Profile.GetProfileByEmail(ctx, tx, email)
		if err != nil {
			return err
		}
		if !profile.IsActive {
			return errors.New("user is not active")
		}
		if err := bcrypt.CompareHashAndPassword([]byte(profile.PasswordHash), []byte(password)); err != nil {
			return errors.New("invalid credentials")
		}
		userGUID = profile.Guid.String()
		return nil
	})
	return userGUID, err
}

func (s *service) Register(ctx context.Context, email string, password string) (string, error) {
	// Check if user already exists
	err := s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		_, err := s.repo.Profile.GetProfileByEmail(ctx, tx, email)
		if err == nil {
			return errors.New("user already exists")
		}
		if err != pgx.ErrNoRows {
			return err
		}
		return nil
	})
	if err != nil {
		return "", err
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	// Create profile
	var userGUID string
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		guid := uuid.New()
		userGUID = guid.String()
		now := time.Now().UTC()
		_, err := s.repo.Profile.CreateProfile(ctx, tx, repository_profile.CreateProfileParams{
			Guid:         guid,
			Email:        email,
			PasswordHash: string(hashedPassword),
			IsActive:     true,
			CreatedAt:    sql.NullTime{Time: now, Valid: true},
			UpdatedAt:    sql.NullTime{Time: now, Valid: true},
		})
		return err
	})
	if err != nil {
		return "", err
	}

	return userGUID, nil
}

func (s *service) Restore(ctx context.Context, email string) error {
	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		profile, err := s.repo.Profile.GetProfileByEmail(ctx, tx, email)
		if err != nil {
			return err
		}

		// Generate verification token
		verificationToken := uuid.New().String()
		now := time.Now().UTC()

		// Update profile with new verification token
		_, err = s.repo.Profile.UpdateProfile(ctx, tx, repository_profile.UpdateProfileParams{
			Guid:              profile.Guid,
			VerificationToken: sql.NullString{String: verificationToken, Valid: true},
			UpdatedAt:         sql.NullTime{Time: now, Valid: true},
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

func NewService(repo *repository.Repositories) Service {
	return &service{repo: repo}
}
