package call

import (
	"PlatformService/internal/config"
	"PlatformService/internal/router/mw"
	"PlatformService/internal/service"
	"encoding/json"
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

	// Получаем userGUID из контекста (установлен AuthMiddleware)
	userGUID, ok := ctx.Value(mw.UserIDKey).(string)
	if !ok {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Проверяем существование звонка
	_, err := uuid.Parse(callId)
	if err != nil {
		http.Error(w, "Invalid call ID", http.StatusBadRequest)
		return
	}

	// Подключение WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		s.log.ErrorContext(ctx, "Failed to upgrade WebSocket connection", "error", err)
		return
	}
	defer conn.Close()

	s.log.InfoContext(ctx, "WebSocket connection established", "user_id", userGUID, "call_id", callId)

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
		s.log.InfoContext(ctx, "WebSocket connection closed", "user_id", userGUID, "call_id", callId)
		roomsMutex.Lock()
		if room, exists := callRooms[callId]; exists {
			room.mutex.Lock()
			delete(room.Connections, userGUID)
			room.mutex.Unlock()
		}
		roomsMutex.Unlock()
		close(wsConn.Send)
	}()

	var wg sync.WaitGroup
	wg.Add(2) // Теперь у нас 2 горутины

	// Горутина для отправки сообщений
	go func() {
		defer wg.Done()
		for {
			select {
			case message, ok := <-wsConn.Send:
				if !ok {
					s.log.InfoContext(ctx, "WebSocket send channel closed")
					return
				}

				if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
					s.log.ErrorContext(ctx, "Error writing WebSocket message", "error", err)
					return
				}
			}
		}
	}()

	// Горутина для чтения сообщений
	go func() {
		defer wg.Done()
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					s.log.ErrorContext(ctx, "Unexpected WebSocket close error", "error", err)
				} else {
					s.log.InfoContext(ctx, "WebSocket connection closed by client", "error", err)
				}
				break
			}

			s.log.DebugContext(ctx, "Received WebSocket message", "message", string(message))

			var data map[string]interface{}
			if err := json.Unmarshal(message, &data); err != nil {
				s.log.ErrorContext(ctx, "Failed to unmarshal WebSocket message", "error", err, "message", string(message))
				continue
			}

			messageType, ok := data["type"].(string)
			if !ok {
				s.log.WarnContext(ctx, "WebSocket message missing type field", "data", data)
				continue
			}

			s.log.InfoContext(ctx, "Processing WebSocket message", "type", messageType, "user_id", userGUID)

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
					s.log.ErrorContext(ctx, "Error saving transcript", "error", err)
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
					s.log.ErrorContext(ctx, "Error ending call", "error", err)
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

	// Ждем завершения всех горутин
	wg.Wait()
}

func (s *Server) broadcastToRoom(callID string, senderID string, message []byte) {
	// Ограничиваем превью сообщения для логирования
	messagePreview := string(message)
	if len(messagePreview) > 100 {
		messagePreview = messagePreview[:100] + "..."
	}
	s.log.Info("broadcastToRoom called", "call_id", callID, "sender_id", senderID, "message_preview", messagePreview)

	roomsMutex.RLock()
	room, exists := callRooms[callID]
	roomsMutex.RUnlock()

	if !exists {
		s.log.Warn("Room not found for broadcast", "call_id", callID)
		return
	}

	room.mutex.RLock()
	connections := make(map[string]*WebSocketConnection)
	for userID, conn := range room.Connections {
		connections[userID] = conn
	}
	room.mutex.RUnlock()

	s.log.Info("Broadcasting message to room", "call_id", callID, "sender_id", senderID, "total_connections", len(connections))

	var toRemove []string
	broadcastCount := 0
	for userID, conn := range connections {
		if senderID != "" && userID == senderID {
			s.log.Debug("Skipping sender", "user_id", userID)
			continue // Не отправляем отправителю
		}

		s.log.Debug("Attempting to send message to user", "user_id", userID)
		select {
		case conn.Send <- message:
			s.log.Info("Message successfully sent to user", "user_id", userID)
			broadcastCount++
		default:
			s.log.Error("Failed to send message to user - channel full or closed", "user_id", userID)
			toRemove = append(toRemove, userID)
		}
	}

	s.log.Info("Broadcast completed", "call_id", callID, "sent_to_count", broadcastCount, "failed_count", len(toRemove))

	// Удаляем недоступные соединения
	if len(toRemove) > 0 {
		room.mutex.Lock()
		for _, userID := range toRemove {
			if conn, exists := room.Connections[userID]; exists {
				s.log.Warn("Removing failed connection", "user_id", userID)
				close(conn.Send)
				delete(room.Connections, userID)
			}
		}
		room.mutex.Unlock()
	}
}

func NewServer(services *service.Services, log *slog.Logger, cfg *config.Config) ServerInterface {
	return &Server{
		services: services,
		log:      log,
		cfg:      cfg,
	}
}
