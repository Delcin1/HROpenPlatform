package cv

import (
	"PlatformService/internal/repository"
	repository_cv "PlatformService/internal/repository/cv"
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
)

type Service interface {
	SaveCVLink(ctx context.Context, userGUID string, link string) error
	GetCVLink(ctx context.Context, userGUID string) (string, error)
}

type service struct {
	repo *repository.Repositories
}

func (s *service) GetCVLink(ctx context.Context, userGUID string) (string, error) {
	userGUIDUUID, err := uuid.Parse(userGUID)
	if err != nil {
		return "", err
	}

	var link string
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		res, err := s.repo.CV.GetCVByUserGUID(ctx, tx, userGUIDUUID.String())
		if err != nil {
			return err
		}

		link = res.Link
		return nil
	})
	if err != nil {
		return "", err
	}

	return link, nil
}

func (s *service) SaveCVLink(ctx context.Context, userGUID string, link string) error {
	userGUIDUUID, err := uuid.Parse(userGUID)
	if err != nil {
		return err
	}

	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		_, err := s.repo.CV.CreateCV(ctx, tx, repository_cv.CreateCVParams{
			Guid:     uuid.New(),
			UserGuid: userGUIDUUID.String(),
			Link:     link,
		})
		return err
	})
}

func NewService(repo *repository.Repositories) Service {
	return &service{repo: repo}
}
