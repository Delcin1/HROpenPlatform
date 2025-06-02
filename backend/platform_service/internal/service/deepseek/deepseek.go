package deepseek

import (
	"PlatformService/internal/config"
	"PlatformService/internal/models"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type Service interface {
	AnalyzeResume(ctx context.Context, resumeContent string) (*models.DeepSeekAnalysisResponse, error)
	MatchCandidates(ctx context.Context, jobDescription string, resumes []models.ResumeRecord) (*models.DeepSeekMatchResponse, error)
}

type service struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

type deepSeekRequest struct {
	Model    string            `json:"model"`
	Messages []deepSeekMessage `json:"messages"`
	Stream   bool              `json:"stream"`
}

type deepSeekMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type deepSeekResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func NewService(cfg *config.Config) Service {
	return &service{
		apiKey:  cfg.DeepSeekAPIKey,
		baseURL: cfg.DeepSeekAPIURL,
		model:   cfg.DeepSeekModel,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (s *service) AnalyzeResume(ctx context.Context, resumeContent string) (*models.DeepSeekAnalysisResponse, error) {
	prompt := fmt.Sprintf(`Проанализируй следующее резюме и верни результат строго в JSON формате без дополнительного текста. 

Резюме:
%s

Верни JSON с полями:
- candidate_name: ФИО кандидата (строка)
- candidate_age: возраст кандидата (число или null если не указан)
- experience_years: общий опыт работы (строка, например "3 года" или "5 лет")
- analysis: детальный анализ резюме включающий soft и hard skills, оценку опыта, рекомендации (строка)

Ответ должен содержать только JSON без дополнительного текста.`, resumeContent)

	response, err := s.makeRequest(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to analyze resume: %w", err)
	}

	var result models.DeepSeekAnalysisResponse
	if err := json.Unmarshal([]byte(response), &result); err != nil {
		return nil, fmt.Errorf("failed to parse DeepSeek response: %w", err)
	}

	return &result, nil
}

func (s *service) MatchCandidates(ctx context.Context, jobDescription string, resumes []models.ResumeRecord) (*models.DeepSeekMatchResponse, error) {
	candidatesInfo := make([]string, len(resumes))
	for i, resume := range resumes {
		candidatesInfo[i] = fmt.Sprintf(`{
			"resume_id": "%s",
			"candidate_name": "%s",
			"file_url": "%s",
			"analysis": "%s"
		}`, resume.ID, resume.CandidateName, resume.FileURL, strings.ReplaceAll(resume.Analysis, `"`, `\"`))
	}

	prompt := fmt.Sprintf(`Подбери топ-5 кандидатов из базы резюме для данной вакансии и верни результат строго в JSON формате без дополнительного текста.

Описание вакансии:
%s

Кандидаты:
[%s]

Верни JSON с полем candidates содержащим массив из максимум 5 лучших кандидатов, отсортированных по убыванию соответствия:
{
  "candidates": [
    {
      "resume_id": "id кандидата",
      "candidate_name": "ФИО кандидата", 
      "file_url": "ссылка на резюме",
      "match_score": число от 1 до 100,
      "reasoning": "объяснение почему кандидат подходит"
    }
  ]
}

Ответ должен содержать только JSON без дополнительного текста.`, jobDescription, strings.Join(candidatesInfo, ","))

	response, err := s.makeRequest(ctx, prompt)
	if err != nil {
		return nil, fmt.Errorf("failed to match candidates: %w", err)
	}

	var result models.DeepSeekMatchResponse
	response = strings.Replace(response, "```json", "", -1)
	response = strings.Replace(response, "```", "", -1)
	if err := json.Unmarshal([]byte(response), &result); err != nil {
		return nil, fmt.Errorf("failed to parse DeepSeek match response: %w", err)
	}

	return &result, nil
}

func (s *service) makeRequest(ctx context.Context, prompt string) (string, error) {
	req := deepSeekRequest{
		Model: s.model,
		Messages: []deepSeekMessage{
			{
				Role:    "user",
				Content: prompt,
			},
		},
		Stream: false,
	}

	reqBody, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.baseURL, bytes.NewBuffer(reqBody))
	if err != nil {
		return "", fmt.Errorf("failed to create HTTP request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.apiKey)

	resp, err := s.client.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("failed to make HTTP request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("DeepSeek API error: status %d, body: %s", resp.StatusCode, string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	var deepSeekResp deepSeekResponse
	if err := json.Unmarshal(body, &deepSeekResp); err != nil {
		return "", fmt.Errorf("failed to unmarshal DeepSeek response: %w", err)
	}

	if len(deepSeekResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in DeepSeek response")
	}

	return deepSeekResp.Choices[0].Message.Content, nil
}
