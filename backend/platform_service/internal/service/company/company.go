package company

import (
	"PlatformService/internal/models"
	"PlatformService/internal/repository"
	repository_company "PlatformService/internal/repository/company"
	"PlatformService/internal/utils"
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
)

type Service interface {
	GetExperience(ctx context.Context, userGUID string) ([]models.Experience, error)
	UpdateExperience(ctx context.Context, userGUID string, experience *models.Experience) error
	CreateCompany(ctx context.Context, userGUID string, company *models.Company) (*models.Company, error)
	GetCompany(ctx context.Context, companyId string) (*models.Company, error)
	UpdateCompany(ctx context.Context, userGUID string, companyId string, company *models.Company) (*models.Company, error)
	DeleteCompany(ctx context.Context, userGUID string, companyId string) error
	SearchCompanies(ctx context.Context, name string) ([]models.ShortCompany, error)
}

type service struct {
	repo *repository.Repositories
}

func (s *service) GetExperience(ctx context.Context, userGUID string) ([]models.Experience, error) {
	userGUIDUUID, err := uuid.Parse(userGUID)
	if err != nil {
		return nil, err
	}

	var experiences []models.Experience
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		profileCompanies, err := s.repo.Company.GetProfileCompanies(ctx, tx, userGUIDUUID)
		if err != nil {
			return err
		}

		for _, pc := range profileCompanies {
			company, err := s.repo.Company.GetCompanyByGUID(ctx, tx, pc.CompanyGuid)
			if err != nil {
				return err
			}

			guid := company.Guid.String()
			experience := models.Experience{
				CompanyName: company.Name,
				Position:    pc.Position,
				StartDate:   pc.StartedAt.Time.Format(time.RFC3339),
				Guid:        &guid,
			}
			if pc.FinishedAt.Valid {
				endDate := pc.FinishedAt.Time.Format(time.RFC3339)
				experience.EndDate = &endDate
			}
			experiences = append(experiences, experience)
		}
		return nil
	})

	return experiences, err
}

func (s *service) UpdateExperience(ctx context.Context, userGUID string, experience *models.Experience) error {
	userGUIDUUID, err := uuid.Parse(userGUID)
	if err != nil {
		return err
	}

	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		if experience.Guid != nil {
			companyGUID, err := uuid.Parse(*experience.Guid)
			if err != nil {
				return err
			}

			startDate, err := time.Parse(time.RFC3339, experience.StartDate)
			if err != nil {
				return err
			}

			var endDate sql.NullTime
			if experience.EndDate != nil {
				endTime, err := time.Parse(time.RFC3339, *experience.EndDate)
				if err != nil {
					return err
				}
				endDate = sql.NullTime{Time: endTime, Valid: true}
			}

			_, err = s.repo.Company.UpdateProfileCompany(ctx, tx, repository_company.UpdateProfileCompanyParams{
				Position:    experience.Position,
				FinishedAt:  endDate,
				UserGuid:    userGUIDUUID,
				CompanyGuid: companyGUID,
				StartedAt:   sql.NullTime{Time: startDate, Valid: true},
			})
			return err
		}
		return nil
	})
}

func (s *service) CreateCompany(ctx context.Context, userGUID string, company *models.Company) (*models.Company, error) {
	companyGUID := uuid.New()
	var createdCompany *models.Company

	err := s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		result, err := s.repo.Company.CreateCompany(ctx, tx, repository_company.CreateCompanyParams{
			Guid:          companyGUID,
			Name:          company.Name,
			Description:   utils.StringPtrToNullString(company.Description),
			Email:         utils.StringPtrToNullString(company.Email),
			Phone:         utils.StringPtrToNullString(company.Phone),
			Website:       utils.StringPtrToNullString(company.Website),
			Address:       utils.StringPtrToNullString(company.Address),
			Avatar:        utils.StringPtrToNullString(company.Avatar),
			ShortLinkName: utils.StringPtrToNullString(company.ShortLinkName),
		})
		if err != nil {
			return err
		}

		createdCompany = &models.Company{
			Guid:          result.Guid.String(),
			Name:          result.Name,
			Description:   &result.Description.String,
			Email:         &result.Email.String,
			Phone:         &result.Phone.String,
			Website:       &result.Website.String,
			Address:       &result.Address.String,
			Avatar:        &result.Avatar.String,
			ShortLinkName: &result.ShortLinkName.String,
		}
		return nil
	})

	return createdCompany, err
}

func (s *service) GetCompany(ctx context.Context, companyId string) (*models.Company, error) {
	var companyGUID uuid.UUID
	var err error

	// Try to parse as UUID first
	companyGUID, err = uuid.Parse(companyId)
	if err != nil {
		// If not a UUID, try to get by short link name
		err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
			result, err := s.repo.Company.GetCompanyByShortLink(ctx, tx, sql.NullString{String: companyId, Valid: true})
			if err != nil {
				return err
			}
			companyGUID = result.Guid
			return nil
		})
		if err != nil {
			return nil, err
		}
	}

	var company *models.Company
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		result, err := s.repo.Company.GetCompanyByGUID(ctx, tx, companyGUID)
		if err != nil {
			return err
		}

		company = &models.Company{
			Guid:          result.Guid.String(),
			Name:          result.Name,
			Description:   &result.Description.String,
			Email:         &result.Email.String,
			Phone:         &result.Phone.String,
			Website:       &result.Website.String,
			Address:       &result.Address.String,
			Avatar:        &result.Avatar.String,
			ShortLinkName: &result.ShortLinkName.String,
		}
		return nil
	})

	return company, err
}

func (s *service) UpdateCompany(ctx context.Context, userGUID string, companyId string, company *models.Company) (*models.Company, error) {
	companyGUID, err := uuid.Parse(companyId)
	if err != nil {
		return nil, err
	}

	var updatedCompany *models.Company
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		result, err := s.repo.Company.UpdateCompany(ctx, tx, repository_company.UpdateCompanyParams{
			Name:          company.Name,
			Description:   utils.StringPtrToNullString(company.Description),
			Email:         utils.StringPtrToNullString(company.Email),
			Phone:         utils.StringPtrToNullString(company.Phone),
			Website:       utils.StringPtrToNullString(company.Website),
			Address:       utils.StringPtrToNullString(company.Address),
			Avatar:        utils.StringPtrToNullString(company.Avatar),
			ShortLinkName: utils.StringPtrToNullString(company.ShortLinkName),
			Guid:          companyGUID,
		})
		if err != nil {
			return err
		}

		updatedCompany = &models.Company{
			Guid:          result.Guid.String(),
			Name:          result.Name,
			Description:   &result.Description.String,
			Email:         &result.Email.String,
			Phone:         &result.Phone.String,
			Website:       &result.Website.String,
			Address:       &result.Address.String,
			Avatar:        &result.Avatar.String,
			ShortLinkName: &result.ShortLinkName.String,
		}
		return nil
	})

	return updatedCompany, err
}

func (s *service) DeleteCompany(ctx context.Context, userGUID string, companyId string) error {
	companyGUID, err := uuid.Parse(companyId)
	if err != nil {
		return err
	}

	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		return s.repo.Company.DeleteCompany(ctx, tx, companyGUID)
	})
}

func (s *service) SearchCompanies(ctx context.Context, name string) ([]models.ShortCompany, error) {
	var companies []models.ShortCompany
	err := s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		results, err := s.repo.Company.SearchCompanies(ctx, tx, sql.NullString{String: name, Valid: true})
		if err != nil {
			return err
		}

		for _, c := range results {
			company := models.ShortCompany{
				Guid:          c.Guid.String(),
				Name:          c.Name,
				ShortLinkName: &c.ShortLinkName.String,
			}
			companies = append(companies, company)
		}
		return nil
	})

	return companies, err
}

func NewService(repo *repository.Repositories) Service {
	return &service{repo: repo}
}
