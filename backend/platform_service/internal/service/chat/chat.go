package chat

import (
	"PlatformService/internal/models"
	"PlatformService/internal/repository"
	"PlatformService/internal/repository/chat"
	"PlatformService/internal/utils"
	"context"
	"encoding/json"
	"errors"
	"sync"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgtype"
)

type Service interface {
	CreateChat(ctx context.Context, userIDs []string) (*models.Chat, error)
	GetUserChats(ctx context.Context, userID string) ([]models.ChatWithLastMessage, error)
	GetChatMessages(ctx context.Context, chatID string, limit, offset int) ([]models.Message, error)
	SendMessage(ctx context.Context, chatID, userID, text string) (*models.Message, error)
	Subscribe(chatID string, conn *WebSocketConnection)
	Unsubscribe(chatID string, conn *WebSocketConnection)
}

type WebSocketConnection struct {
	UserID string
	Send   chan []byte
}

type service struct {
	repo       *repository.Repositories
	clients    map[string]map[*WebSocketConnection]bool
	clientsMux sync.RWMutex
}

func (s *service) CreateChat(ctx context.Context, userIDs []string) (*models.Chat, error) {
	if len(userIDs) != 2 {
		return nil, errors.New("chat must have exactly 2 users")
	}

	var ret models.Chat
	err := s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		userGUID1, err := uuid.Parse(userIDs[0])
		if err != nil {
			return err
		}
		userGUID2, err := uuid.Parse(userIDs[1])
		if err != nil {
			return err
		}
		chat, err := s.repo.Chat.GetChatByUsersIDs(ctx, tx, chat.GetChatByUsersIDsParams{
			UserID: userGUID1,
			UserID_2: userGUID2,
		})
		if err == nil {
			ret = models.Chat{
				ID:        chat.ID.String(),
				CreatedAt: chat.CreatedAt,
				UpdatedAt: chat.UpdatedAt,
				Users:     userIDs,
			}
			return nil
		}

		return err
	})

	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return nil, err
	}

	if err == nil {
		return &ret, nil
	}

	// Create chat
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		// Create chat
		result, err := s.repo.Chat.CreateChat(ctx, tx)
		if err != nil {
			return err
		}

		// Add users to chat
		for _, userID := range userIDs {
			userGUID, err := uuid.Parse(userID)
			if err != nil {
				return err
			}
			err = s.repo.Chat.AddUserToChat(ctx, tx, chat.AddUserToChatParams{
				ChatID: result.ID,
				UserID: userGUID,
			})
			if err != nil {
				return err
			}
		}

		ret = models.Chat{
			ID:        result.ID.String(),
			CreatedAt: result.CreatedAt,
			UpdatedAt: result.UpdatedAt,
			Users:     userIDs,
		}
		return nil
	})

	return &ret, err
}

func (s *service) GetUserChats(ctx context.Context, userID string) ([]models.ChatWithLastMessage, error) {
	userGUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	var chats []models.ChatWithLastMessage
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		results, err := s.repo.Chat.GetUserChats(ctx, tx, userGUID)
		if err != nil {
			return err
		}

		for _, result := range results {
			// Get last message
			lastMessageFromDB, err := s.repo.Chat.GetLastMessage(ctx, tx, result.ID)
			if err != nil && !errors.Is(err, pgx.ErrNoRows) {
				return err
			}

			var lastMessage *models.Message
			if !errors.Is(err, pgx.ErrNoRows) {
				lastMessage = &models.Message{
					ID:        lastMessageFromDB.ID.String(),
					ChatID:    lastMessageFromDB.ChatID.String(),
					UserID:    lastMessageFromDB.UserID.String(),
					Text:      lastMessageFromDB.Text,
					CreatedAt: lastMessageFromDB.CreatedAt,
				}
			}

			// Get unread count
			unreadCount, err := s.repo.Chat.GetUnreadCount(ctx, tx, chat.GetUnreadCountParams{
				ChatID: result.ID,
				UserID: userGUID,
			})
			if err != nil {
				return err
			}

			users, ok := result.Users.(pgtype.UUIDArray)
			if !ok {
				return errors.New("failed to cast users to []string")
			}

			usersGUIDs, err := utils.UUIDArrayToStringArray(users)
			if err != nil {
				return err
			}

			chat := models.ChatWithLastMessage{
				Chat: models.Chat{
					ID:        result.ID.String(),
					CreatedAt: result.CreatedAt,
					UpdatedAt: result.UpdatedAt,
					Users:     usersGUIDs,
				},
				LastMessage: lastMessage,
				UnreadCount: int(unreadCount),
			}

			chats = append(chats, chat)
		}
		return nil
	})

	return chats, err
}

func (s *service) GetChatMessages(ctx context.Context, chatID string, limit, offset int) ([]models.Message, error) {
	chatGUID, err := uuid.Parse(chatID)
	if err != nil {
		return nil, err
	}

	var messages []models.Message
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		results, err := s.repo.Chat.GetChatMessages(ctx, tx, chat.GetChatMessagesParams{
			ChatID: chatGUID,
			Limit:  int32(limit),
			Offset: int32(offset),
		})
		if err != nil {
			return err
		}

		for _, result := range results {
			messages = append(messages, models.Message{
				ID:        result.ID.String(),
				ChatID:    result.ChatID.String(),
				UserID:    result.UserID.String(),
				Text:      result.Text,
				CreatedAt: result.CreatedAt,
			})
		}
		return nil
	})

	return messages, err
}

func (s *service) SendMessage(ctx context.Context, chatID, userID, text string) (*models.Message, error) {
	chatGUID, err := uuid.Parse(chatID)
	if err != nil {
		return nil, err
	}

	userGUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, err
	}

	var message models.Message
	err = s.repo.TxManager.WithTransaction(ctx, func(ctx context.Context, tx pgx.Tx) error {
		// Create message
		result, err := s.repo.Chat.CreateMessage(ctx, tx, chat.CreateMessageParams{
			ChatID: chatGUID,
			UserID: userGUID,
			Text:   text,
		})
		if err != nil {
			return err
		}

		// Update chat updated_at
		err = s.repo.Chat.UpdateChatUpdatedAt(ctx, tx, chatGUID)
		if err != nil {
			return err
		}

		message = models.Message{
			ID:        result.ID.String(),
			ChatID:    result.ChatID.String(),
			UserID:    result.UserID.String(),
			Text:      result.Text,
			CreatedAt: result.CreatedAt,
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	// Broadcast message to all clients in the chat
	s.clientsMux.RLock()
	if clients, ok := s.clients[chatID]; ok {
		messageJSON, err := json.Marshal(message)
		if err != nil {
			s.clientsMux.RUnlock()
			return nil, err
		}

		for client := range clients {
			select {
			case client.Send <- messageJSON:
			default:
				// Skip if client's buffer is full
			}
		}
	}
	s.clientsMux.RUnlock()

	return &message, nil
}

func (s *service) Subscribe(chatID string, conn *WebSocketConnection) {
	s.clientsMux.Lock()
	if _, ok := s.clients[chatID]; !ok {
		s.clients[chatID] = make(map[*WebSocketConnection]bool)
	}
	s.clients[chatID][conn] = true
	s.clientsMux.Unlock()
}

func (s *service) Unsubscribe(chatID string, conn *WebSocketConnection) {
	s.clientsMux.Lock()
	if clients, ok := s.clients[chatID]; ok {
		delete(clients, conn)
		if len(clients) == 0 {
			delete(s.clients, chatID)
		}
	}
	s.clientsMux.Unlock()
}

func NewService(repo *repository.Repositories) Service {
	return &service{
		repo:    repo,
		clients: make(map[string]map[*WebSocketConnection]bool),
	}
}
