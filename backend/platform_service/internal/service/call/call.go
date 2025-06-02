package call

import (
	"PlatformService/internal/models"
	"PlatformService/internal/repository"
	"PlatformService/internal/repository/call"
	"PlatformService/internal/utils"
	"context"
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/google/uuid"
	"github.com/jackc/pgtype"
	"github.com/jackc/pgx/v4"
)

type Service interface {
	CreateCall(ctx context.Context, participants []string) (*models.Call, error)
	GetCallHistory(ctx context.Context, userID string, limit, offset int) ([]models.CallWithTranscript, error)
	HandleCallSignal(ctx context.Context, chatID string, userID string, signal []byte) error
	BroadcastCallSignal(ctx context.Context, chatID string, fromUserID string, signal []byte) error
	AddTranscript(ctx context.Context, callID, userID, text string) error
	EndCall(ctx context.Context, callID string) error
}

type service struct {
	repo *repository.Repositories
	log  *slog.Logger
	// Хранилище активных звонков
	activeCalls sync.Map
}

type CallSignal struct {
	Type       string          `json:"type"`
	FromUser   string          `json:"from_user"`
	Signal     json.RawMessage `json:"signal"`
	CallerName string          `json:"caller_name,omitempty"`
}

func (s *service) CreateCall(ctx context.Context, participants []string) (*models.Call, error) {
	var callResult *models.Call

	err := s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		// Создаем звонок
		callData, err := s.repo.Call.CreateCall(ctx, tx)
		if err != nil {
			return err
		}

		// Добавляем участников
		for _, participantID := range participants {
			participantGUID, err := uuid.Parse(participantID)
			if err != nil {
				continue // Пропускаем невалидные GUID
			}

			err = s.repo.Call.AddParticipantToCall(ctx, tx, call.AddParticipantToCallParams{
				CallID: callData.ID,
				UserID: participantGUID,
			})
			if err != nil {
				return err
			}
		}

		// Получаем информацию об участниках
		callParticipants, err := s.repo.Call.GetCallParticipants(ctx, tx, callData.ID)
		if err != nil {
			return err
		}

		participantsList := make([]models.CallParticipant, len(callParticipants))
		for i, p := range callParticipants {
			participantsList[i] = models.CallParticipant{
				Id:          p.UserID.String(),
				Description: p.Description,
				Avatar:      &p.Avatar.String,
			}
		}

		callResult = &models.Call{
			Id:           callData.ID.String(),
			Participants: participantsList,
			CreatedAt:    callData.CreatedAt,
			Status:       models.CallStatus(callData.Status),
		}

		return nil
	})

	return callResult, err
}

func (s *service) GetCallHistory(ctx context.Context, userID string, limit, offset int) ([]models.CallWithTranscript, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	var callsWithTranscripts []models.CallWithTranscript

	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		// Получаем историю звонков пользователя
		calls, err := s.repo.Call.GetCallHistory(ctx, tx, call.GetCallHistoryParams{
			UserID: userUUID,
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			return err
		}

		callsWithTranscripts = make([]models.CallWithTranscript, len(calls))

		for i, callData := range calls {
			// Получаем участников звонка
			participants, err := s.repo.Call.GetCallParticipants(ctx, tx, callData.ID)
			if err != nil {
				return err
			}

			callParticipants := make([]models.CallParticipant, len(participants))
			for j, p := range participants {
				callParticipants[j] = models.CallParticipant{
					Id:          p.UserID.String(),
					Description: p.Description,
					Avatar:      &p.Avatar.String,
				}
			}

			// Получаем транскрипты звонка
			transcripts, err := s.repo.Call.GetCallTranscripts(ctx, tx, callData.ID)
			if err != nil {
				return err
			}

			transcriptEntries := make([]models.TranscriptEntry, len(transcripts))
			for j, t := range transcripts {
				transcriptEntries[j] = models.TranscriptEntry{
					User: models.CallParticipant{
						Id:          t.UserID.String(),
						Description: t.UserDescription,
						Avatar:      &t.UserAvatar.String,
					},
					Text:      t.Text,
					Timestamp: t.Timestamp,
				}
			}

			callModel := models.Call{
				Id:           callData.ID.String(),
				Participants: callParticipants,
				CreatedAt:    callData.CreatedAt,
				Status:       models.CallStatus(callData.Status),
			}

			if callData.EndedAt.Valid {
				callModel.EndedAt = &callData.EndedAt.Time
			}

			callsWithTranscripts[i] = models.CallWithTranscript{
				Call:       callModel,
				Transcript: transcriptEntries,
			}
		}

		return nil
	})

	return callsWithTranscripts, err
}

func (s *service) AddTranscript(ctx context.Context, callID, userID, text string) error {
	callUUID, err := uuid.Parse(callID)
	if err != nil {
		return err
	}

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return err
	}

	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		_, err := s.repo.Call.AddTranscript(ctx, tx, call.AddTranscriptParams{
			CallID: callUUID,
			UserID: userUUID,
			Text:   text,
		})
		return err
	})
}

func (s *service) EndCall(ctx context.Context, callID string) error {
	callUUID, err := uuid.Parse(callID)
	if err != nil {
		return err
	}

	return s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		return s.repo.Call.EndCall(ctx, tx, callUUID)
	})
}

func (s *service) HandleCallSignal(ctx context.Context, chatID string, userID string, signal []byte) error {
	var callSignal CallSignal
	if err := json.Unmarshal(signal, &callSignal); err != nil {
		return err
	}

	// Добавляем информацию об отправителе
	callSignal.FromUser = userID

	// Получаем профиль пользователя для отображения имени
	if callSignal.Type == "call-request" {
		userGUID, err := uuid.Parse(userID)
		if err != nil {
			return err
		}

		var profile *models.Profile
		err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
			profileData, err := s.repo.Profile.GetProfileByGUID(ctx, tx, userGUID)
			if err != nil {
				return err
			}
			profile = &models.Profile{
				Guid:        profileData.Guid.String(),
				Description: profileData.Description,
			}
			return nil
		})
		if err != nil {
			return err
		}
		callSignal.CallerName = profile.Description
	}

	// Сериализуем сигнал обратно
	signalBytes, err := json.Marshal(callSignal)
	if err != nil {
		return err
	}

	// Отправляем сигнал всем участникам чата
	return s.BroadcastCallSignal(ctx, chatID, userID, signalBytes)
}

func (s *service) BroadcastCallSignal(ctx context.Context, chatID string, fromUserID string, signal []byte) error {
	// Получаем список пользователей в чате
	chatGUID, err := uuid.Parse(chatID)
	if err != nil {
		return err
	}

	var chat *models.Chat
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		chatData, err := s.repo.Chat.GetChatByID(ctx, tx, chatGUID)
		if err != nil {
			return err
		}

		// Преобразуем UUID в строки для пользователей
		users, err := utils.UUIDArrayToStringArray(chatData.Users.(pgtype.UUIDArray))
		if err != nil {
			return err
		}

		chat = &models.Chat{
			ID:    chatData.ID.String(),
			Users: users,
		}
		return nil
	})
	if err != nil {
		return err
	}

	// Отправляем сигнал всем участникам чата, кроме отправителя
	for _, userID := range chat.Users {
		if userID != fromUserID {
			// Здесь должна быть логика отправки через WebSocket
			// В данном случае мы просто логируем
			s.log.Info("Broadcasting call signal",
				"chat_id", chatID,
				"from_user", fromUserID,
				"to_user", userID,
				"signal", string(signal),
			)
		}
	}

	return nil
}

func NewService(repo *repository.Repositories, log *slog.Logger) Service {
	return &service{
		repo: repo,
		log:  log,
	}
}
