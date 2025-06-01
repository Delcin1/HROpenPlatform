package call

import (
	"PlatformService/internal/config"
	"PlatformService/internal/router/mw"
	"PlatformService/internal/service"
	"PlatformService/internal/service/auth"
	"encoding/json"
	"log"
	"log/slog"
	"net/http"
	"sync"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

type Server struct {
	services *service.Services
	log      *slog.Logger
	cfg      *config.Config
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

type WebSocketConnection struct {
	UserID string
	Send   chan []byte
}

type CallRoom struct {
	ID          string
	Connections map[string]*WebSocketConnection
	mutex       sync.RWMutex
}

var callRooms = make(map[string]*CallRoom)
var roomsMutex sync.RWMutex

// CreateCall implements ServerInterface.
func (s *Server) CreateCall(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	userGUID, ok := ctx.Value(mw.UserIDKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var req CreateCallRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(req.Participants) == 0 {
		http.Error(w, "At least one participant is required", http.StatusBadRequest)
		return
	}

	// Добавляем создателя звонка к участникам
	participants := append(req.Participants, userGUID)

	// Создаем звонок через сервис
	call, err := s.services.Call.CreateCall(ctx, participants)
	if err != nil {
		s.log.ErrorContext(ctx, "Failed to create call", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Создаем комнату для звонка
	roomsMutex.Lock()
	callRooms[call.Id] = &CallRoom{
		ID:          call.Id,
		Connections: make(map[string]*WebSocketConnection),
	}
	roomsMutex.Unlock()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(call)
}

// GetCallHistory implements ServerInterface.
func (s *Server) GetCallHistory(w http.ResponseWriter, r *http.Request, params GetCallHistoryParams) {
	ctx := r.Context()

	userGUID, ok := ctx.Value(mw.UserIDKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	limit := 50
	offset := 0

	if params.Limit != nil {
		limit = *params.Limit
	}
	if params.Offset != nil {
		offset = *params.Offset
	}

	// Получаем историю звонков через сервис
	callsWithTranscripts, err := s.services.Call.GetCallHistory(ctx, userGUID, limit, offset)
	if err != nil {
		s.log.ErrorContext(ctx, "Failed to get call history", "error", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(callsWithTranscripts)
}

// HandleWebSocket implements ServerInterface.
func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request, callId string, params HandleWebSocketParams) {
	ctx := r.Context()

	// Валидация токена
	claims, err := auth.ValidateToken(params.Token, s.cfg.AccessTokenSecret)
	if err != nil {
		s.log.ErrorContext(ctx, "Failed to validate token", "error", err)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Проверяем существование звонка
	_, err = uuid.Parse(callId)
	if err != nil {
		http.Error(w, "Invalid call ID", http.StatusBadRequest)
		return
	}

	// Подключение WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	userGUID := claims.UserGUID

	// Создаем соединение
	wsConn := &WebSocketConnection{
		UserID: userGUID,
		Send:   make(chan []byte, 256),
	}

	// Добавляем в комнату звонка
	roomsMutex.Lock()
	room, exists := callRooms[callId]
	if !exists {
		room = &CallRoom{
			ID:          callId,
			Connections: make(map[string]*WebSocketConnection),
		}
		callRooms[callId] = room
	}
	room.mutex.Lock()
	room.Connections[userGUID] = wsConn
	room.mutex.Unlock()
	roomsMutex.Unlock()

	// Удаляем из комнаты при отключении
	defer func() {
		roomsMutex.Lock()
		if room, exists := callRooms[callId]; exists {
			room.mutex.Lock()
			delete(room.Connections, userGUID)
			room.mutex.Unlock()
		}
		roomsMutex.Unlock()
	}()

	var wg sync.WaitGroup
	wg.Add(1)

	// Горутина для чтения сообщений
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

			var data map[string]interface{}
			if err := json.Unmarshal(message, &data); err != nil {
				continue
			}

			messageType, ok := data["type"].(string)
			if !ok {
				continue
			}

			switch messageType {
			case "webrtc-signal":
				// Пересылаем WebRTC сигналы другим участникам
				s.broadcastToRoom(callId, userGUID, message)

			case "speech-transcript":
				// Обрабатываем транскрипт речи
				text, ok := data["text"].(string)
				if !ok {
					continue
				}

				// Сохраняем транскрипт через сервис
				err := s.services.Call.AddTranscript(ctx, callId, userGUID, text)
				if err != nil {
					log.Printf("Error saving transcript: %v", err)
				}

				// Отправляем транскрипт всем участникам
				transcriptMessage := map[string]interface{}{
					"type":      "transcript",
					"user_id":   userGUID,
					"text":      text,
					"timestamp": data["timestamp"],
				}
				transcriptBytes, _ := json.Marshal(transcriptMessage)
				s.broadcastToRoom(callId, "", transcriptBytes) // Отправляем всем, включая отправителя

			case "call-end":
				// Завершаем звонок через сервис
				err := s.services.Call.EndCall(ctx, callId)
				if err != nil {
					log.Printf("Error ending call: %v", err)
				}

				// Уведомляем всех участников о завершении звонка
				endMessage := map[string]interface{}{
					"type": "call-ended",
				}
				endBytes, _ := json.Marshal(endMessage)
				s.broadcastToRoom(callId, "", endBytes)
				return
			}
		}
	}()

	// Горутина для отправки сообщений
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

func (s *Server) broadcastToRoom(callID string, senderID string, message []byte) {
	roomsMutex.RLock()
	room, exists := callRooms[callID]
	roomsMutex.RUnlock()

	if !exists {
		return
	}

	room.mutex.RLock()
	defer room.mutex.RUnlock()

	for userID, conn := range room.Connections {
		if senderID != "" && userID == senderID {
			continue // Не отправляем отправителю
		}

		select {
		case conn.Send <- message:
		default:
			close(conn.Send)
			delete(room.Connections, userID)
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
