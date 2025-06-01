package chat

import (
	"PlatformService/internal/config"
	"PlatformService/internal/router/mw"
	"PlatformService/internal/service"
	"PlatformService/internal/service/auth"
	"PlatformService/internal/service/chat"
	"encoding/json"
	"log"
	"log/slog"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // В продакшене нужно настроить правильную проверку origin
	},
}

type Server struct {
	services *service.Services
	log      *slog.Logger
	cfg      *config.Config
}

// CreateChat implements ServerInterface.
func (s *Server) CreateChat(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateChatRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.log.ErrorContext(ctx, "chatServer.CreateChat failed to decode request body", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	chat, err := s.services.Chat.CreateChat(ctx, req.Users)
	if err != nil {
		s.log.ErrorContext(ctx, "chatServer.CreateChat failed to create chat", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	users := make([]ChatUser, len(chat.Users))

	for i, user := range chat.Users {
		profile, err := s.services.Profile.GetProfile(ctx, user)
		if err != nil {
			s.log.ErrorContext(ctx, "chatServer.CreateChat failed to get profile", "error", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
		users[i] = ChatUser{
			Id:          profile.Guid,
			Description: profile.Description,
			Avatar:      profile.Avatar,
		}
	}

	resp := Chat{
		CreatedAt: chat.CreatedAt,
		Id:        chat.ID,
		UpdatedAt: chat.UpdatedAt,
		Users:     users,
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

// GetChatMessages implements ServerInterface.
func (s *Server) GetChatMessages(w http.ResponseWriter, r *http.Request, chatId string, params GetChatMessagesParams) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	limit := 10
	offset := 0
	if params.Limit != nil {
		limit = *params.Limit
	}
	if params.Offset != nil {
		offset = *params.Offset
	}

	messages, err := s.services.Chat.GetChatMessages(ctx, chatId, limit, offset)
	if err != nil {
		s.log.ErrorContext(ctx, "chatServer.GetChatMessages failed to get chat messages", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	resp := make([]Message, len(messages))
	for i, message := range messages {
		profile, err := s.services.Profile.GetProfile(ctx, message.UserID)
		if err != nil {
			s.log.ErrorContext(ctx, "chatServer.GetChatMessages failed to get profile", "error", err)
			http.Error(w, "Internal Server Error", http.StatusInternalServerError)
			return
		}
		resp[i] = Message{
			ChatId:    message.ChatID,
			CreatedAt: message.CreatedAt,
			Id:        message.ID,
			Text:      message.Text,
			User: ChatUser{
				Id:          profile.Guid,
				Description: profile.Description,
				Avatar:      profile.Avatar,
			},
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// GetUserChats implements ServerInterface.
func (s *Server) GetUserChats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	chats, err := s.services.Chat.GetUserChats(ctx, userGUID)
	if err != nil {
		s.log.ErrorContext(ctx, "chatServer.GetUserChats failed to get user chats", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	resp := make([]ChatWithLastMessage, len(chats))
	for i, chat := range chats {
		var lastMessage *Message
		if chat.LastMessage != nil {
			profile, err := s.services.Profile.GetProfile(ctx, chat.LastMessage.UserID)
			if err != nil {
				s.log.ErrorContext(ctx, "chatServer.GetUserChats failed to get profile", "error", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}
			lastMessage = &Message{
				ChatId:    chat.LastMessage.ChatID,
				CreatedAt: chat.LastMessage.CreatedAt,
				Id:        chat.LastMessage.ID,
				Text:      chat.LastMessage.Text,
				User: ChatUser{
					Id:          profile.Guid,
					Description: profile.Description,
					Avatar:      profile.Avatar,
				},
			}
		}

		users := make([]ChatUser, len(chat.Chat.Users))
		for j, user := range chat.Chat.Users {
			profile, err := s.services.Profile.GetProfile(ctx, user)
			if err != nil {
				s.log.ErrorContext(ctx, "chatServer.GetUserChats failed to get profile", "error", err)
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}
			users[j] = ChatUser{
				Id:          profile.Guid,
				Description: profile.Description,
				Avatar:      profile.Avatar,
			}
		}

		resp[i] = ChatWithLastMessage{
			Chat: Chat{
				CreatedAt: chat.Chat.CreatedAt,
				Id:        chat.Chat.ID,
				UpdatedAt: chat.Chat.UpdatedAt,
				Users:     users,
			},
			LastMessage: lastMessage,
			UnreadCount: chat.UnreadCount,
		}
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(resp)
}

// SendMessage implements ServerInterface.
func (s *Server) SendMessage(w http.ResponseWriter, r *http.Request, chatId string) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.log.ErrorContext(ctx, "chatServer.SendMessage failed to decode request body", "error", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	message, err := s.services.Chat.SendMessage(ctx, chatId, userGUID, req.Text)
	if err != nil {
		s.log.ErrorContext(ctx, "chatServer.SendMessage failed to send message", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	profile, err := s.services.Profile.GetProfile(ctx, message.UserID)
	if err != nil {
		s.log.ErrorContext(ctx, "chatServer.SendMessage failed to get profile", "error", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	resp := Message{
		ChatId:    message.ChatID,
		CreatedAt: message.CreatedAt,
		Id:        message.ID,
		Text:      message.Text,
		User: ChatUser{
			Id:          profile.Guid,
			Description: profile.Description,
			Avatar:      profile.Avatar,
		},
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

// HandleWebSocket implements ServerInterface.
func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request, chatId string, params HandleWebSocketParams) {
	ctx := r.Context()
	claims, err := auth.ValidateToken(params.Token, s.cfg.AccessTokenSecret)
	if err != nil {
		s.log.ErrorContext(ctx, "authMiddleware.ValidateToken failed to validate token", "error", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	wsConn := &chat.WebSocketConnection{
		UserID: claims.UserGUID,
		Send:   make(chan []byte, 256),
	}

	s.services.Chat.Subscribe(chatId, wsConn)
	defer s.services.Chat.Unsubscribe(chatId, wsConn)

	s.log.Info("Chat WebSocket connection established", "user_id", claims.UserGUID, "chat_id", chatId)

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					s.log.Error("Error reading WebSocket message", "error", err)
				}
				s.log.Info("Chat WebSocket connection closed", "user_id", claims.UserGUID, "chat_id", chatId)
				break
			}

			s.log.Info("Chat WebSocket message received", "user_id", claims.UserGUID, "chat_id", chatId, "message", string(message))

			// Проверяем, является ли сообщение сигналом видеозвонка
			var signal map[string]interface{}
			if err := json.Unmarshal(message, &signal); err == nil {
				if signalType, ok := signal["type"].(string); ok {
					s.log.Info("Processing chat signal", "type", signalType, "user_id", claims.UserGUID, "chat_id", chatId)
					// Обрабатываем уведомления о видеозвонках
					if signalType == "incoming-video-call" || signalType == "call-accepted" || signalType == "call-declined" {
						s.log.Info("Broadcasting video call signal", "type", signalType, "from_user", claims.UserGUID, "chat_id", chatId)
						// Рассылаем уведомление всем участникам чата (кроме отправителя)
						s.services.Chat.BroadcastMessage(chatId, message, claims.UserGUID)
						continue
					}
				}
			}

			// Если это не сигнал видеозвонка, обрабатываем как обычное сообщение
			_, err = s.services.Chat.SendMessage(r.Context(), chatId, claims.UserGUID, string(message))
			if err != nil {
				s.log.Error("Error sending chat message", "error", err)
			}
		}
	}()

	for {
		select {
		case message, ok := <-wsConn.Send:
			if !ok {
				s.log.Info("Chat WebSocket send channel closed", "user_id", claims.UserGUID, "chat_id", chatId)
				return
			}

			s.log.Info("Sending message to chat WebSocket", "user_id", claims.UserGUID, "chat_id", chatId, "message", string(message))
			if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
				s.log.Error("Error writing WebSocket message", "error", err)
				return
			}
		}
	}
}

func NewServer(services *service.Services, log *slog.Logger, cfg *config.Config) ServerInterface {
	return &Server{
		services: services,
		log:      log,
		cfg:      cfg,
	}
}
