package profile

import (
	"PlatformService/internal/models"
	"PlatformService/internal/repository"
	repository_profile "PlatformService/internal/repository/profile"
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
)

type Service interface {
	GetProfile(ctx context.Context, userGUID string) (*models.Profile, error)
	CreateProfile(ctx context.Context, userGUID string, profile *models.Profile) error
	UpdateProfile(ctx context.Context, userGUID string, profile *models.Profile) error
	DeleteProfile(ctx context.Context, userGUID string) error
	SearchProfiles(ctx context.Context, description string) ([]models.ShortProfile, error)
}

type service struct {
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
		Phone:       profile.Phone.String,
		Email:       profile.Email.String,
		Birthdate:   profile.Birthday,
		Gender:      profile.Gender,
		Avatar:      &profile.Avatar.String,
		CreatedAt:   profile.CreatedAt.Time,
		UpdatedAt:   profile.UpdatedAt.Time,
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
			Email:       sql.NullString{String: profile.Email, Valid: true},
			Phone:       sql.NullString{String: profile.Phone, Valid: true},
			Gender:      profile.Gender,
			Birthday:    profile.Birthdate,
			Avatar:      sql.NullString{String: *profile.Avatar, Valid: profile.Avatar != nil},
			CreatedAt:   sql.NullTime{Time: now, Valid: true},
			UpdatedAt:   sql.NullTime{Time: now, Valid: true},
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
			Email:       sql.NullString{String: profile.Email, Valid: true},
			Phone:       sql.NullString{String: profile.Phone, Valid: true},
			Gender:      profile.Gender,
			Birthday:    profile.Birthdate,
			Avatar:      sql.NullString{String: *profile.Avatar, Valid: profile.Avatar != nil},
			UpdatedAt:   sql.NullTime{Time: now, Valid: true},
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

func NewService(repo *repository.Repositories) Service {
	return &service{repo: repo}
}
