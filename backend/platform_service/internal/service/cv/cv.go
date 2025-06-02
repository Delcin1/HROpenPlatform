package cv

import (
	"PlatformService/internal/models"
	"PlatformService/internal/repository"
	repository_cv "PlatformService/internal/repository/cv"
	repository_job "PlatformService/internal/repository/job"
	"PlatformService/internal/service/deepseek"
	"PlatformService/internal/service/storage"
	"archive/zip"
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"io"
	"mime/multipart"
	"path/filepath"
	"regexp"
	"strings"
	"unicode/utf8"

	"github.com/dslipak/pdf"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
)

type Service interface {
	SaveCVLink(ctx context.Context, userGUID string, link string) error
	GetCVLink(ctx context.Context, userGUID string) (string, error)
	UploadResumeDatabase(ctx context.Context, userGUID string, archive *multipart.FileHeader) (*models.UploadDatabaseResponse, error)
	GetResumeDatabase(ctx context.Context, userGUID string, limit, offset int) ([]models.ResumeRecord, error)
	MatchCandidatesFromDatabase(ctx context.Context, userGUID, jobID string) (*models.MatchCandidatesResponse, error)
}

type service struct {
	repo              *repository.Repositories
	storageService    storage.Service
	deepSeekService   deepseek.Service
	serverFullAddress string
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

func (s *service) UploadResumeDatabase(ctx context.Context, userGUID string, archive *multipart.FileHeader) (*models.UploadDatabaseResponse, error) {
	userUUID, err := uuid.Parse(userGUID)
	if err != nil {
		return nil, fmt.Errorf("invalid user GUID: %w", err)
	}

	// Открываем архив
	file, err := archive.Open()
	if err != nil {
		return nil, fmt.Errorf("failed to open archive: %w", err)
	}
	defer file.Close()

	// Читаем содержимое в память
	archiveBytes, err := io.ReadAll(file)
	if err != nil {
		return nil, fmt.Errorf("failed to read archive: %w", err)
	}

	// Открываем ZIP архив
	zipReader, err := zip.NewReader(bytes.NewReader(archiveBytes), int64(len(archiveBytes)))
	if err != nil {
		return nil, fmt.Errorf("failed to read ZIP archive: %w", err)
	}

	var processedCount, successfulCount, failedCount int
	var resumes []models.ResumeRecord

	// Обрабатываем каждый файл в архиве
	for _, zipFile := range zipReader.File {
		processedCount++

		// Проверяем расширение файла
		ext := strings.ToLower(filepath.Ext(zipFile.Name))
		if !isValidResumeFile(ext) {
			failedCount++
			continue
		}

		// Читаем содержимое файла
		fileReader, err := zipFile.Open()
		if err != nil {
			failedCount++
			continue
		}

		fileContent, err := io.ReadAll(fileReader)
		fileReader.Close()
		if err != nil {
			failedCount++
			continue
		}

		// Генерируем уникальное имя файла
		filename := fmt.Sprintf("%s_%s", uuid.New().String(), zipFile.Name)

		// Загружаем файл в storage
		_, err = s.storageService.UploadFile(ctx, bytes.NewReader(fileContent), filename)
		if err != nil {
			failedCount++
			continue
		}

		// Создаем публичную ссылку
		publicURL := fmt.Sprintf("%s/api/v1/cv/%s", s.serverFullAddress, filename)

		// Анализируем резюме через DeepSeek
		resumeText := extractTextFromFile(fileContent, ext)
		analysis, err := s.deepSeekService.AnalyzeResume(ctx, resumeText)
		if err != nil {
			failedCount++
			continue
		}

		// Сохраняем в базу данных
		var candidateAge sql.NullInt32
		if analysis.CandidateAge != nil {
			candidateAge = sql.NullInt32{Int32: int32(*analysis.CandidateAge), Valid: true}
		}

		var resume repository_cv.CvResumeDatabase
		err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
			var err error
			resume, err = s.repo.CV.CreateResumeRecord(ctx, tx, repository_cv.CreateResumeRecordParams{
				UserID:          userUUID,
				CandidateName:   analysis.CandidateName,
				CandidateAge:    candidateAge,
				ExperienceYears: analysis.ExperienceYears,
				FileUrl:         publicURL,
				Analysis:        analysis.Analysis,
			})
			return err
		})

		if err != nil {
			failedCount++
			continue
		}

		// Добавляем к результату
		resumeRecord := models.ResumeRecord{
			ID:              resume.ID.String(),
			UserID:          resume.UserID.String(),
			CandidateName:   resume.CandidateName,
			CandidateAge:    nil,
			ExperienceYears: resume.ExperienceYears,
			FileURL:         resume.FileUrl,
			Analysis:        resume.Analysis,
			CreatedAt:       resume.CreatedAt,
			UpdatedAt:       resume.UpdatedAt,
		}

		if resume.CandidateAge.Valid {
			age := int(resume.CandidateAge.Int32)
			resumeRecord.CandidateAge = &age
		}

		resumes = append(resumes, resumeRecord)
		successfulCount++
	}

	return &models.UploadDatabaseResponse{
		ProcessedCount:  processedCount,
		SuccessfulCount: successfulCount,
		FailedCount:     failedCount,
		Resumes:         resumes,
	}, nil
}

func (s *service) GetResumeDatabase(ctx context.Context, userGUID string, limit, offset int) ([]models.ResumeRecord, error) {
	userUUID, err := uuid.Parse(userGUID)
	if err != nil {
		return nil, fmt.Errorf("invalid user GUID: %w", err)
	}

	var dbResumes []repository_cv.CvResumeDatabase
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		dbResumes, err = s.repo.CV.GetResumesByUserID(ctx, tx, repository_cv.GetResumesByUserIDParams{
			UserID: userUUID,
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		return err
	})

	if err != nil {
		return nil, fmt.Errorf("failed to get resumes: %w", err)
	}

	resumes := make([]models.ResumeRecord, len(dbResumes))
	for i, dbResume := range dbResumes {
		resume := models.ResumeRecord{
			ID:              dbResume.ID.String(),
			UserID:          dbResume.UserID.String(),
			CandidateName:   dbResume.CandidateName,
			CandidateAge:    nil,
			ExperienceYears: dbResume.ExperienceYears,
			FileURL:         dbResume.FileUrl,
			Analysis:        dbResume.Analysis,
			CreatedAt:       dbResume.CreatedAt,
			UpdatedAt:       dbResume.UpdatedAt,
		}

		if dbResume.CandidateAge.Valid {
			age := int(dbResume.CandidateAge.Int32)
			resume.CandidateAge = &age
		}

		resumes[i] = resume
	}

	return resumes, nil
}

func (s *service) MatchCandidatesFromDatabase(ctx context.Context, userGUID, jobID string) (*models.MatchCandidatesResponse, error) {
	userUUID, err := uuid.Parse(userGUID)
	if err != nil {
		return nil, fmt.Errorf("invalid user GUID: %w", err)
	}

	jobUUID, err := uuid.Parse(jobID)
	if err != nil {
		return nil, fmt.Errorf("invalid job ID: %w", err)
	}

	// Проверяем, что пользователь является автором вакансии
	var job repository_job.JobJob
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		var err error
		job, err = s.repo.Job.GetJobByID(ctx, tx, jobUUID)
		return err
	})

	if err != nil {
		return nil, fmt.Errorf("job not found: %w", err)
	}

	if job.AuthorID != userUUID {
		return nil, fmt.Errorf("access denied: not job author")
	}

	// Получаем резюме пользователя
	resumes, err := s.GetResumeDatabase(ctx, userGUID, 1000, 0) // Получаем все резюме
	if err != nil {
		return nil, fmt.Errorf("failed to get resumes: %w", err)
	}

	if len(resumes) == 0 {
		return &models.MatchCandidatesResponse{Candidates: []models.MatchedCandidate{}}, nil
	}

	// Формируем описание вакансии
	jobDescription := fmt.Sprintf("Название: %s\nОписание: %s\nТребования: %s",
		job.Title, job.Description, job.Requirements)

	// Подбираем кандидатов через DeepSeek
	matchResponse, err := s.deepSeekService.MatchCandidates(ctx, jobDescription, resumes)
	if err != nil {
		return nil, fmt.Errorf("failed to match candidates: %w", err)
	}

	// Преобразуем ответ
	candidates := make([]models.MatchedCandidate, len(matchResponse.Candidates))
	for i, candidate := range matchResponse.Candidates {
		candidates[i] = models.MatchedCandidate{
			ResumeID:      candidate.ResumeID,
			CandidateName: candidate.CandidateName,
			FileURL:       candidate.FileURL,
			MatchScore:    candidate.MatchScore,
			Reasoning:     candidate.Reasoning,
		}
	}

	return &models.MatchCandidatesResponse{Candidates: candidates}, nil
}

func isValidResumeFile(ext string) bool {
	validExtensions := []string{".pdf", ".txt", ".doc", ".docx"}
	for _, validExt := range validExtensions {
		if ext == validExt {
			return true
		}
	}
	return false
}

func extractTextFromFile(content []byte, ext string) string {
	switch ext {
	case ".txt":
		return string(content)
	case ".pdf":
		return extractTextFromPDF(content)
	case ".doc", ".docx":
		return extractTextFromDOCX(content)
	default:
		// Пытаемся интерпретировать как текст если это валидный UTF-8
		if utf8.Valid(content) {
			return string(content)
		}
		return ""
	}
}

func extractTextFromPDF(content []byte) string {
	f, err := pdf.NewReader(bytes.NewReader(content), int64(len(content)))
	if err != nil {
		return ""
	}

	var buf bytes.Buffer
	text, err := f.GetPlainText()
	if err != nil {
		return ""
	}

	buf.ReadFrom(text)

	return buf.String()
}

func extractTextFromDOCX(content []byte) string {
	// Простое извлечение текста из DOCX через поиск XML элементов
	text := string(content)

	// Ищем текстовые элементы <w:t>
	textPattern := regexp.MustCompile(`<w:t[^>]*>(.*?)</w:t>`)
	matches := textPattern.FindAllStringSubmatch(text, -1)

	var textBuilder strings.Builder
	for _, match := range matches {
		if len(match) > 1 {
			// Декодируем HTML entities
			cleanText := strings.ReplaceAll(match[1], "&lt;", "<")
			cleanText = strings.ReplaceAll(cleanText, "&gt;", ">")
			cleanText = strings.ReplaceAll(cleanText, "&amp;", "&")
			cleanText = strings.ReplaceAll(cleanText, "&quot;", "\"")
			cleanText = strings.ReplaceAll(cleanText, "&#39;", "'")

			textBuilder.WriteString(cleanText)
			textBuilder.WriteString(" ")
		}
	}

	result := textBuilder.String()
	if len(result) == 0 {
		// Fallback: ищем любой читаемый текст
		cleanPattern := regexp.MustCompile(`[^\x20-\x7E\p{L}\p{N}\s]`)
		result = cleanPattern.ReplaceAllString(string(content), "")
		// Ограничиваем длину для безопасности
		if len(result) > 10000 {
			result = result[:10000]
		}
	}

	return strings.TrimSpace(result)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func NewService(repo *repository.Repositories, storageService storage.Service, deepSeekService deepseek.Service, serverFullAddress string) Service {
	return &service{
		repo:              repo,
		storageService:    storageService,
		deepSeekService:   deepSeekService,
		serverFullAddress: serverFullAddress,
	}
}
