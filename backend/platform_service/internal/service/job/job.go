package job

import (
	"PlatformService/internal/models"
	"PlatformService/internal/repository"
	repository_job "PlatformService/internal/repository/job"
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
)

type Service interface {
	GetAllJobs(ctx context.Context, search *string, limit, offset int) ([]models.Job, error)
	GetJobByID(ctx context.Context, jobID, userID string) (*models.JobDetails, error)
	GetMyJobs(ctx context.Context, userID string, limit, offset int) ([]models.JobWithApplications, error)
	CreateJob(ctx context.Context, userID string, req *models.CreateJobRequest) (*models.Job, error)
	UpdateJob(ctx context.Context, jobID, userID string, req *models.UpdateJobRequest) (*models.Job, error)
	DeleteJob(ctx context.Context, jobID, userID string) error
	ApplyToJob(ctx context.Context, jobID, userID string) error
	GetApplicationStatus(ctx context.Context, jobID, userID string) (*models.ApplicationStatus, error)
	GetJobApplications(ctx context.Context, jobID, userID string, limit, offset int) ([]models.JobApplication, error)
	UpdateJobApplicationStatus(ctx context.Context, jobID, applicantID, authorID, status string) (*models.JobApplication, error)
}

type service struct {
	repo *repository.Repositories
}

func (s *service) GetAllJobs(ctx context.Context, search *string, limit, offset int) ([]models.Job, error) {
	var jobs []repository_job.JobJob

	err := s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		var searchText string
		if search != nil && *search != "" {
			searchText = *search
		}

		var err error
		jobs, err = s.repo.Job.GetJobs(ctx, tx, repository_job.GetJobsParams{
			Column1: searchText,
			Limit:   int32(limit),
			Offset:  int32(offset),
		})
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get jobs: %w", err)
	}

	result := make([]models.Job, len(jobs))
	for i, job := range jobs {
		result[i] = s.mapJobFromDB(job)
	}

	return result, nil
}

func (s *service) GetJobByID(ctx context.Context, jobID, userID string) (*models.JobDetails, error) {
	jobUUID, err := uuid.Parse(jobID)
	if err != nil {
		return nil, fmt.Errorf("invalid job ID: %w", err)
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	var job repository_job.JobJob
	var applications []repository_job.GetJobApplicationsRow
	var hasApplied bool

	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		job, err = s.repo.Job.GetJobByID(ctx, tx, jobUUID)
		if err != nil {
			if err == sql.ErrNoRows {
				return fmt.Errorf("job not found")
			}
			return fmt.Errorf("failed to get job: %w", err)
		}

		// Проверяем, подавал ли пользователь заявку
		_, err = s.repo.Job.GetJobApplication(ctx, tx, repository_job.GetJobApplicationParams{
			JobID:       jobUUID,
			ApplicantID: userUUID,
		})
		hasApplied = err == nil

		// Если пользователь автор, загружаем заявки
		if job.AuthorID == userUUID {
			applications, err = s.repo.Job.GetJobApplications(ctx, tx, repository_job.GetJobApplicationsParams{
				JobID:  jobUUID,
				Limit:  int32(100), // Загружаем все заявки для автора
				Offset: 0,
			})
			if err != nil {
				return fmt.Errorf("failed to get job applications: %w", err)
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	isAuthor := job.AuthorID == userUUID
	canApply := !isAuthor && !hasApplied && job.Status == "active"

	details := &models.JobDetails{
		Job:        s.mapJobFromDB(job),
		IsAuthor:   isAuthor,
		CanApply:   canApply,
		HasApplied: hasApplied,
	}

	if isAuthor {
		// Всегда инициализируем Applications для автора, даже если заявок нет
		details.Applications = make([]models.JobApplication, len(applications))
		for i, app := range applications {
			details.Applications[i] = s.mapJobApplicationFromDB(app)
		}
	}

	return details, nil
}

func (s *service) GetMyJobs(ctx context.Context, userID string, limit, offset int) ([]models.JobWithApplications, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	var jobs []repository_job.GetJobsByAuthorRow

	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		jobs, err = s.repo.Job.GetJobsByAuthor(ctx, tx, repository_job.GetJobsByAuthorParams{
			AuthorID: userUUID,
			Limit:    int32(limit),
			Offset:   int32(offset),
		})
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get user jobs: %w", err)
	}

	result := make([]models.JobWithApplications, len(jobs))
	for i, job := range jobs {
		result[i] = models.JobWithApplications{
			Job: s.mapJobFromDB(repository_job.JobJob{
				ID:             job.ID,
				Title:          job.Title,
				CompanyName:    job.CompanyName,
				Location:       job.Location,
				EmploymentType: job.EmploymentType,
				SalaryFrom:     job.SalaryFrom,
				SalaryTo:       job.SalaryTo,
				Description:    job.Description,
				Requirements:   job.Requirements,
				AuthorID:       job.AuthorID,
				CreatedAt:      job.CreatedAt,
				UpdatedAt:      job.UpdatedAt,
				Status:         job.Status,
			}),
			ApplicationsCount: int(job.ApplicationsCount),
		}
	}

	return result, nil
}

func (s *service) CreateJob(ctx context.Context, userID string, req *models.CreateJobRequest) (*models.Job, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	var salaryFrom, salaryTo sql.NullInt32
	if req.SalaryFrom != nil {
		salaryFrom = sql.NullInt32{Int32: int32(*req.SalaryFrom), Valid: true}
	}
	if req.SalaryTo != nil {
		salaryTo = sql.NullInt32{Int32: int32(*req.SalaryTo), Valid: true}
	}

	var job repository_job.JobJob

	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		job, err = s.repo.Job.CreateJob(ctx, tx, repository_job.CreateJobParams{
			Title:          req.Title,
			CompanyName:    req.CompanyName,
			Location:       req.Location,
			EmploymentType: req.EmploymentType,
			SalaryFrom:     salaryFrom,
			SalaryTo:       salaryTo,
			Description:    req.Description,
			Requirements:   req.Requirements,
			AuthorID:       userUUID,
		})
		return err
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create job: %w", err)
	}

	result := s.mapJobFromDB(job)
	return &result, nil
}

func (s *service) UpdateJob(ctx context.Context, jobID, userID string, req *models.UpdateJobRequest) (*models.Job, error) {
	jobUUID, err := uuid.Parse(jobID)
	if err != nil {
		return nil, fmt.Errorf("invalid job ID: %w", err)
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	var salaryFrom, salaryTo sql.NullInt32
	if req.SalaryFrom != nil {
		salaryFrom = sql.NullInt32{Int32: int32(*req.SalaryFrom), Valid: true}
	}
	if req.SalaryTo != nil {
		salaryTo = sql.NullInt32{Int32: int32(*req.SalaryTo), Valid: true}
	}

	var job repository_job.JobJob

	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		job, err = s.repo.Job.UpdateJob(ctx, tx, repository_job.UpdateJobParams{
			ID:             jobUUID,
			Title:          req.Title,
			CompanyName:    req.CompanyName,
			Location:       req.Location,
			EmploymentType: req.EmploymentType,
			SalaryFrom:     salaryFrom,
			SalaryTo:       salaryTo,
			Description:    req.Description,
			Requirements:   req.Requirements,
			Status:         req.Status,
			AuthorID:       userUUID,
		})
		return err
	})
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("job not found or access denied")
		}
		return nil, fmt.Errorf("failed to update job: %w", err)
	}

	result := s.mapJobFromDB(job)
	return &result, nil
}

func (s *service) DeleteJob(ctx context.Context, jobID, userID string) error {
	jobUUID, err := uuid.Parse(jobID)
	if err != nil {
		return fmt.Errorf("invalid job ID: %w", err)
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		return s.repo.Job.DeleteJob(ctx, tx, repository_job.DeleteJobParams{
			ID:       jobUUID,
			AuthorID: userUUID,
		})
	})
}

func (s *service) ApplyToJob(ctx context.Context, jobID, userID string) error {
	jobUUID, err := uuid.Parse(jobID)
	if err != nil {
		return fmt.Errorf("invalid job ID: %w", err)
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		// Проверяем, что вакансия существует и активна
		job, err := s.repo.Job.GetJobByID(ctx, tx, jobUUID)
		if err != nil {
			if err == sql.ErrNoRows {
				return fmt.Errorf("job not found")
			}
			return fmt.Errorf("failed to get job: %w", err)
		}

		if job.Status != "active" {
			return fmt.Errorf("job is not active")
		}

		if job.AuthorID == userUUID {
			return fmt.Errorf("cannot apply to your own job")
		}

		// Проверяем, не подавал ли уже заявку
		_, err = s.repo.Job.GetJobApplication(ctx, tx, repository_job.GetJobApplicationParams{
			JobID:       jobUUID,
			ApplicantID: userUUID,
		})
		if err == nil {
			return fmt.Errorf("already applied to this job")
		}

		// Создаем заявку
		_, err = s.repo.Job.CreateJobApplication(ctx, tx, repository_job.CreateJobApplicationParams{
			JobID:       jobUUID,
			ApplicantID: userUUID,
		})
		if err != nil {
			return fmt.Errorf("failed to create job application: %w", err)
		}

		return nil
	})
}

func (s *service) GetApplicationStatus(ctx context.Context, jobID, userID string) (*models.ApplicationStatus, error) {
	jobUUID, err := uuid.Parse(jobID)
	if err != nil {
		return nil, fmt.Errorf("invalid job ID: %w", err)
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	var application repository_job.JobJobApplication
	var hasApplication bool

	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		application, err = s.repo.Job.GetJobApplication(ctx, tx, repository_job.GetJobApplicationParams{
			JobID:       jobUUID,
			ApplicantID: userUUID,
		})
		if err != nil {
			if err == sql.ErrNoRows {
				hasApplication = false
				return nil
			}
			return fmt.Errorf("failed to get application status: %w", err)
		}
		hasApplication = true
		return nil
	})
	if err != nil {
		return nil, err
	}

	if !hasApplication {
		return &models.ApplicationStatus{
			HasApplied:    false,
			ApplicationID: nil,
			Status:        nil,
		}, nil
	}

	appID := application.ID.String()
	status := application.Status
	return &models.ApplicationStatus{
		HasApplied:    true,
		ApplicationID: &appID,
		Status:        &status,
	}, nil
}

func (s *service) GetJobApplications(ctx context.Context, jobID, userID string, limit, offset int) ([]models.JobApplication, error) {
	jobUUID, err := uuid.Parse(jobID)
	if err != nil {
		return nil, fmt.Errorf("invalid job ID: %w", err)
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	var applications []repository_job.GetJobApplicationsRow

	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		// Проверяем, что пользователь является автором вакансии
		job, err := s.repo.Job.GetJobByID(ctx, tx, jobUUID)
		if err != nil {
			if err == sql.ErrNoRows {
				return fmt.Errorf("job not found")
			}
			return fmt.Errorf("failed to get job: %w", err)
		}

		if job.AuthorID != userUUID {
			return fmt.Errorf("access denied: not job author")
		}

		applications, err = s.repo.Job.GetJobApplications(ctx, tx, repository_job.GetJobApplicationsParams{
			JobID:  jobUUID,
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			return fmt.Errorf("failed to get job applications: %w", err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	result := make([]models.JobApplication, len(applications))
	for i, app := range applications {
		result[i] = s.mapJobApplicationFromDB(app)
	}

	return result, nil
}

func (s *service) mapJobFromDB(job repository_job.JobJob) models.Job {
	var salaryFrom, salaryTo *int
	if job.SalaryFrom.Valid {
		val := int(job.SalaryFrom.Int32)
		salaryFrom = &val
	}
	if job.SalaryTo.Valid {
		val := int(job.SalaryTo.Int32)
		salaryTo = &val
	}

	return models.Job{
		ID:             job.ID.String(),
		Title:          job.Title,
		CompanyName:    job.CompanyName,
		Location:       job.Location,
		EmploymentType: job.EmploymentType,
		SalaryFrom:     salaryFrom,
		SalaryTo:       salaryTo,
		Description:    job.Description,
		Requirements:   job.Requirements,
		AuthorID:       job.AuthorID.String(),
		CreatedAt:      job.CreatedAt,
		UpdatedAt:      job.UpdatedAt,
		Status:         job.Status,
	}
}

func (s *service) mapJobApplicationFromDB(app repository_job.GetJobApplicationsRow) models.JobApplication {
	var avatar *string
	if app.ApplicantAvatar.Valid {
		avatar = &app.ApplicantAvatar.String
	}

	return models.JobApplication{
		ID:          app.ID.String(),
		JobID:       app.JobID.String(),
		ApplicantID: app.ApplicantID.String(),
		ApplicantProfile: models.ApplicantProfile{
			ID:          app.ApplicantID.String(),
			Description: app.ApplicantDescription,
			Email:       app.ApplicantEmail,
			Avatar:      avatar,
		},
		AppliedAt: app.AppliedAt,
		Status:    app.Status,
	}
}

func (s *service) UpdateJobApplicationStatus(ctx context.Context, jobID, applicantID, authorID, status string) (*models.JobApplication, error) {
	jobUUID, err := uuid.Parse(jobID)
	if err != nil {
		return nil, fmt.Errorf("invalid job ID: %w", err)
	}

	applicantUUID, err := uuid.Parse(applicantID)
	if err != nil {
		return nil, fmt.Errorf("invalid applicant ID: %w", err)
	}

	authorUUID, err := uuid.Parse(authorID)
	if err != nil {
		return nil, fmt.Errorf("invalid author ID: %w", err)
	}

	var updatedApplication repository_job.JobJobApplication
	var applicantProfile repository_job.GetJobApplicationsRow

	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		// Проверяем, что пользователь является автором вакансии
		job, err := s.repo.Job.GetJobByID(ctx, tx, jobUUID)
		if err != nil {
			if err == sql.ErrNoRows {
				return fmt.Errorf("job not found")
			}
			return fmt.Errorf("failed to get job: %w", err)
		}

		if job.AuthorID != authorUUID {
			return fmt.Errorf("access denied: not job author")
		}

		// Обновляем статус заявки
		updatedApplication, err = s.repo.Job.UpdateJobApplicationStatus(ctx, tx, repository_job.UpdateJobApplicationStatusParams{
			JobID:       jobUUID,
			ApplicantID: applicantUUID,
			Status:      status,
		})
		if err != nil {
			if err == sql.ErrNoRows {
				return fmt.Errorf("application not found")
			}
			return fmt.Errorf("failed to update application status: %w", err)
		}

		// Получаем данные профиля соискателя
		applications, err := s.repo.Job.GetJobApplications(ctx, tx, repository_job.GetJobApplicationsParams{
			JobID:  jobUUID,
			Limit:  1,
			Offset: 0,
		})
		if err != nil {
			return fmt.Errorf("failed to get application details: %w", err)
		}

		// Ищем нужную заявку
		for _, app := range applications {
			if app.ApplicantID == applicantUUID {
				applicantProfile = app
				break
			}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	var avatar *string
	if applicantProfile.ApplicantAvatar.Valid {
		avatar = &applicantProfile.ApplicantAvatar.String
	}

	return &models.JobApplication{
		ID:          updatedApplication.ID.String(),
		JobID:       updatedApplication.JobID.String(),
		ApplicantID: updatedApplication.ApplicantID.String(),
		ApplicantProfile: models.ApplicantProfile{
			ID:          updatedApplication.ApplicantID.String(),
			Description: applicantProfile.ApplicantDescription,
			Email:       applicantProfile.ApplicantEmail,
			Avatar:      avatar,
		},
		AppliedAt: updatedApplication.AppliedAt,
		Status:    updatedApplication.Status,
	}, nil
}

func NewService(repo *repository.Repositories) Service {
	return &service{
		repo: repo,
	}
}
