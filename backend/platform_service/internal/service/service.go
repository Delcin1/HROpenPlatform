package service

import (
	"PlatformService/internal/config"
	"PlatformService/internal/models"
	"PlatformService/internal/repository"
	"PlatformService/internal/service/auth"
	"PlatformService/internal/service/company"
	"PlatformService/internal/service/cv"
	"PlatformService/internal/service/profile"
	"PlatformService/internal/service/storage"
	"context"
	"fmt"
	"io"
)

type AuthService interface {
	Login(ctx context.Context, userGUID string, ip, userAgent string) (*models.AuthTokens, error)
	Logout(ctx context.Context, token string) error
	Refresh(ctx context.Context, refreshToken string) (*models.AuthTokens, error)
}

type ProfileService interface {
	GetProfile(ctx context.Context, userGUID string) (*models.Profile, error)
	CreateProfile(ctx context.Context, userGUID string, profile *models.Profile) error
	UpdateProfile(ctx context.Context, userGUID string, profile *models.Profile) error
	DeleteProfile(ctx context.Context, userGUID string) error
	SearchProfiles(ctx context.Context, description string) ([]models.ShortProfile, error)
	Authenticate(ctx context.Context, email string, password string) (string, error)
	Register(ctx context.Context, email string, password string) (string, error)
	Restore(ctx context.Context, email string) error
}

type CompanyService interface {
	GetExperience(ctx context.Context, userGUID string) ([]models.Experience, error)
	UpdateExperience(ctx context.Context, userGUID string, experience *models.Experience) error
	CreateCompany(ctx context.Context, userGUID string, company *models.Company) (*models.Company, error)
	GetCompany(ctx context.Context, companyId string) (*models.Company, error)
	UpdateCompany(ctx context.Context, userGUID string, companyId string, company *models.Company) (*models.Company, error)
	DeleteCompany(ctx context.Context, userGUID string, companyId string) error
	SearchCompanies(ctx context.Context, name string) ([]models.ShortCompany, error)
}

type CVService interface {
	SaveCVLink(ctx context.Context, userGUID string, link string) error
	GetCVLink(ctx context.Context, userGUID string) (string, error)
}

type StorageService interface {
	UploadFile(ctx context.Context, file io.Reader, filename string) (string, error)
	GetFile(ctx context.Context, filename string) (io.ReadCloser, error)
}

type Services struct {
	Auth    AuthService
	Profile ProfileService
	Company CompanyService
	CV      CVService
	Storage StorageService
}

func NewServices(cfg *config.Config, repo *repository.Repositories) (*Services, error) {
	storageService, err := storage.NewService(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage service: %w", err)
	}

	return &Services{
		Auth:    auth.NewService(cfg, repo),
		Profile: profile.NewService(repo),
		Company: company.NewService(repo),
		CV:      cv.NewService(repo),
		Storage: storageService,
	}, nil
}
