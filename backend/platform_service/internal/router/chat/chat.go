package chat

import (
	"PlatformService/internal/router/mw"
	"PlatformService/internal/service"
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

	resp := Chat{
		CreatedAt: chat.CreatedAt,
		Id:        chat.ID,
		UpdatedAt: chat.UpdatedAt,
		Users:     chat.Users,
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
		resp[i] = Message{
			ChatId:    message.ChatID,
			CreatedAt: message.CreatedAt,
			Id:        message.ID,
			Text:      message.Text,
			UserId:    message.UserID,
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
			lastMessage = &Message{
				ChatId:    chat.LastMessage.ChatID,
				CreatedAt: chat.LastMessage.CreatedAt,
				Id:        chat.LastMessage.ID,
				Text:      chat.LastMessage.Text,
				UserId:    chat.LastMessage.UserID,
			}
		}

		resp[i] = ChatWithLastMessage{
			Chat: Chat{
				CreatedAt: chat.Chat.CreatedAt,
				Id:        chat.Chat.ID,
				UpdatedAt: chat.Chat.UpdatedAt,
				Users:     chat.Chat.Users,
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

	resp := Message{
		ChatId:    message.ChatID,
		CreatedAt: message.CreatedAt,
		Id:        message.ID,
		Text:      message.Text,
		UserId:    message.UserID,
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
}

// HandleWebSocket implements ServerInterface.
func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request, chatId string) {
	ctx := r.Context()
	userGUID := ctx.Value(mw.UserIDKey).(string)
	if userGUID == "" {
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
		UserID: userGUID,
		Send:   make(chan []byte, 256),
	}

	s.services.Chat.Subscribe(chatId, wsConn)
	defer s.services.Chat.Unsubscribe(chatId, wsConn)

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("Error reading message: %v", err)
				}
				break
			}

			_, err = s.services.Chat.SendMessage(r.Context(), chatId, userGUID, string(message))
			if err != nil {
				log.Printf("Error sending message: %v", err)
			}
		}
	}()

	for {
		select {
		case message, ok := <-wsConn.Send:
			if !ok {
				return
			}

			if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
				log.Printf("Error writing message: %v", err)
				return
			}
		}
	}
}

func NewServer(services *service.Services, log *slog.Logger) ServerInterface {
	return &Server{
		services: services,
		log:      log,
	}
}
