import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  TextField,
  IconButton,
  Badge,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Send as SendIcon, VideoCall as VideoCallIcon, Phone as PhoneIcon, PhoneDisabled as PhoneDisabledIcon } from '@mui/icons-material';
import { ChatService } from '../api/chat';
import { CallService } from '../api/call';
import type { ChatWithLastMessage, Message } from '../api/chat';
import { useWebSocket } from '../hooks/useWebSocket';
import { VideoCallWithTranscript } from '../components/VideoCallWithTranscript';

export const Chat = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<{
    callId: string;
    callerName: string;
  } | null>(null);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sendMessage, onMessage } = useWebSocket(selectedChat);

  // Устанавливаем selectedChat из URL только при первой загрузке
  useEffect(() => {
    const urlChatId = chatId || searchParams.get('chatId');
    if (urlChatId && !selectedChat) {
      setSelectedChat(urlChatId);
    }
  }, [chatId, searchParams, selectedChat]);

  // Запрос для загрузки списка чатов
  const { data: chats, isLoading: chatsLoading, error: chatsError } = useQuery<ChatWithLastMessage[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      try {
        const response = await ChatService.getUserChats();
        console.log('Server response:', response);
        
        if (!response) {
          console.error('Response is null or undefined');
          return [];
        }

        let parsedResponse = response;
        if (typeof response === 'string') {
          try {
            parsedResponse = JSON.parse(response);
          } catch (e) {
            console.error('Failed to parse response as JSON:', e);
            return [];
          }
        }

        if (!Array.isArray(parsedResponse)) {
          console.error('Parsed response is not an array:', parsedResponse);
          return [];
        }

        return parsedResponse;
      } catch (error) {
        console.error('Error fetching chats:', error);
        return [];
      }
    },
  });

  // Запрос для загрузки сообщений выбранного чата
  const { data: chatMessages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['messages', selectedChat],
    queryFn: async () => {
      if (!selectedChat) return [];
      try {
        const response = await ChatService.getChatMessages(selectedChat, 50, 0);
        if (!response) {
          console.error('Messages response is null or undefined');
          return [];
        }

        let parsedResponse = response;
        if (typeof response === 'string') {
          try {
            parsedResponse = JSON.parse(response);
          } catch (e) {
            console.error('Failed to parse messages response as JSON:', e);
            return [];
          }
        }

        if (!Array.isArray(parsedResponse)) {
          console.error('Parsed messages response is not an array:', parsedResponse);
          return [];
        }

        return parsedResponse;
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    },
    enabled: !!selectedChat,
  });

  useEffect(() => {
    if (!selectedChat) return;

    const unsubscribe = onMessage?.((message: Message) => {
      try {
        const parsedMessage = typeof message === 'string' ? JSON.parse(message) : message;
        
        // Обрабатываем входящие видеозвонки
        if (parsedMessage.type === 'incoming-video-call') {
          setIncomingCall({
            callId: parsedMessage.callId,
            callerName: parsedMessage.callerName,
          });
          // Сразу устанавливаем activeCallId для подключения к WebSocket
          setActiveCallId(parsedMessage.callId);
          return;
        }

        // Обрабатываем отклонение звонка
        if (parsedMessage.type === 'call-declined') {
          setIncomingCall(null);
          setActiveCallId(null);
          setIsVideoCallActive(false);
          alert('Звонок был отклонен');
          return;
        }

        // Обрабатываем принятие звонка
        if (parsedMessage.type === 'call-accepted') {
          setIncomingCall(null);
          // Не меняем состояние звонка для инициатора
          // activeCallId уже должен быть установлен
          return;
        }

        // Обрабатываем завершение звонка
        if (parsedMessage.type === 'call-ended') {
          console.log('📞 Received call-ended message - ending call for all participants');
          setIsVideoCallActive(false);
          setActiveCallId(null);
          setIncomingCall(null);
          setIsIncomingCall(false);
          return;
        }

        // Проверяем, что сообщение относится к текущему выбранному чату
        if (parsedMessage.chat_id !== selectedChat) {
          console.log('⚠️ Message is for different chat, ignoring:', parsedMessage.chat_id, 'current:', selectedChat);
          return;
        }

        console.log('📨 Adding WebSocket message to state:', parsedMessage);
        setMessages((prev) => {
          if (!Array.isArray(prev)) return [parsedMessage];
          if (prev.some(m => m.id === parsedMessage.id)) {
            console.log('⚠️ Message already exists, skipping:', parsedMessage.id);
            return prev;
          }
          console.log('✅ Adding new message to end:', parsedMessage.id);
          return [...prev, parsedMessage];
        });
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [selectedChat, onMessage]);

  useEffect(() => {
    if (chatMessages) {
      const newMessages = Array.isArray(chatMessages) ? chatMessages : [];
      console.log('📥 Received chatMessages from API for chat:', selectedChat, 'messages:', newMessages.length);
      
      // Сортируем сообщения по времени создания (старые первые, новые последние)
      const sortedMessages = newMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      console.log('📥 Messages sorted chronologically, count:', sortedMessages.length);
      
      // При получении сообщений от API всегда заменяем текущие сообщения
      // Это безопасно для переключения чатов
      setMessages(sortedMessages);
    }
  }, [chatMessages, selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    console.log('📤 Sending message:', newMessage.trim());
    try {
      var message = await ChatService.sendMessage(selectedChat, {
        text: newMessage.trim(),
      });

      if (typeof message === 'string') {
        message = JSON.parse(message)
      }
      
      console.log('📤 Message sent via API:', message);
      
      // Добавляем сообщение локально только если это не дубликат
      setMessages(prev => {
        if (prev.some(m => m.id === message.id)) {
          console.log('⚠️ Sent message already exists, skipping local add:', message.id);
          return prev;
        }
        console.log('✅ Adding sent message locally:', message.id);
        return [...prev, message];
      });
      setNewMessage('');
      
      // Отправляем через WebSocket для уведомления других пользователей
      // Отправляем весь объект сообщения для real-time обновлений
      if (sendMessage) {
        console.log('📡 Sending message via WebSocket:', message);
        sendMessage(JSON.stringify(message));
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleStartVideoCall = async () => {
    if (!selectedChat || !chats) return;

    try {
      // Находим текущий чат и получаем других участников
      const currentChat = chats.find(c => c.chat.id === selectedChat);
      if (!currentChat) return;

      const currentUserId = getCurrentUserId();
      const otherParticipants = currentChat.chat.users
        ?.filter(user => user.id !== currentUserId)
        ?.map(user => user.id) || [];

      if (otherParticipants.length === 0) {
        alert('Нет других участников для звонка');
        return;
      }

      // Создаем новый звонок
      const call = await CallService.createCall({
        participants: otherParticipants,
      });

      // Получаем имя текущего пользователя
      const currentUser = currentChat.chat.users?.find(u => u.id === currentUserId);
      const callerName = currentUser?.description || 'Неизвестный пользователь';

      // Отправляем уведомление о входящем видеозвонке через WebSocket
      if (sendMessage) {
        sendMessage(JSON.stringify({
          type: 'incoming-video-call',
          callId: call.id,
          callerName: callerName,
        }));
      }

      setActiveCallId(call.id);
      setIsVideoCallActive(true);
      setIsIncomingCall(false);
    } catch (err) {
      console.error('Error starting video call:', err);
      alert('Ошибка при создании видеозвонка');
    }
  };

  const handleEndVideoCall = () => {
    console.log('📞 Ending video call - resetting all states');
    setIsVideoCallActive(false);
    setActiveCallId(null);
    setIncomingCall(null);
    setIsIncomingCall(false);
  };

  const handleAcceptCall = () => {
    if (!incomingCall) return;

    // Отправляем уведомление о принятии звонка
    if (sendMessage) {
      sendMessage(JSON.stringify({
        type: 'call-accepted',
        callId: incomingCall.callId,
      }));
    }

    // activeCallId уже установлен при получении уведомления
    setIsVideoCallActive(true);
    setIsIncomingCall(true);
    setIncomingCall(null);
  };

  const handleDeclineCall = () => {
    if (!incomingCall) return;

    // Отправляем уведомление об отклонении звонка
    if (sendMessage) {
      sendMessage(JSON.stringify({
        type: 'call-declined',
        callId: incomingCall.callId,
      }));
    }

    setIncomingCall(null);
    setActiveCallId(null);
  };

  const handleChatSelect = (chatId: string) => {
    console.log('🔄 Switching to chat:', chatId, 'from:', selectedChat);
    // Очищаем сообщения при смене чата
    setMessages([]);
    setSelectedChat(chatId);
  };

  const getCurrentUserId = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.user_guid;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  };

  const formatMessageTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isMyMessage = (message: Message) => {
    return message.user.id === getCurrentUserId();
  };

  const currentUserId = getCurrentUserId();

  if (chatsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (chatsError) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="error">
          {chatsError instanceof Error ? chatsError.message : 'Ошибка при загрузке чатов'}
        </Alert>
      </Box>
    );
  }

  if (!chats || !Array.isArray(chats) || chats.length === 0) {
    return (
      <Box sx={{ mt: 4 }}>
        <Alert severity="info">
          У вас пока нет чатов
        </Alert>
      </Box>
    );
  }

  return (
    <>
      {/* Диалог входящего видеозвонка */}
      <Dialog
        open={!!incomingCall}
        onClose={handleDeclineCall}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          <VideoCallIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1, display: 'block', mx: 'auto' }} />
          Входящий видеозвонок
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            {incomingCall?.callerName}
          </Typography>
          <Typography color="text.secondary">
            Хочет начать видеозвонок с вами
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', gap: 2, pb: 3 }}>
          <Button
            onClick={handleDeclineCall}
            variant="outlined"
            color="error"
            startIcon={<PhoneDisabledIcon />}
            size="large"
          >
            Отклонить
          </Button>
          <Button
            onClick={handleAcceptCall}
            variant="contained"
            color="success"
            startIcon={<PhoneIcon />}
            size="large"
          >
            Принять
          </Button>
        </DialogActions>
      </Dialog>

      <Container maxWidth="lg" sx={{ mt: 4, height: 'calc(100vh - 100px)' }}>
        <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
          {/* Список чатов */}
          <Paper sx={{ width: 300, overflow: 'auto' }}>
            <List>
              {Array.isArray(chats) && chats.map((chat) => {
                const otherUser = chat.chat.users?.find(user => user.id !== currentUserId);
                return (
                  <ListItem
                    key={chat.chat.id}
                    button
                    selected={selectedChat === chat.chat.id}
                    onClick={() => handleChatSelect(chat.chat.id)}
                  >
                    <ListItemAvatar>
                      <Badge badgeContent={chat.unread_count} color="primary">
                        <Avatar src={otherUser?.avatar || undefined}>
                          {otherUser?.description?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                      </Badge>
                    </ListItemAvatar>
                    <ListItemText
                      primary={otherUser?.description || 'Без названия'}
                      secondary={chat.last_message?.text || 'Нет сообщений'}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Paper>

          {/* Область чата */}
          <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {selectedChat ? (
              <>
                {/* Заголовок чата */}
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">
                    {chats.find(c => c.chat.id === selectedChat)?.chat.users?.find(u => u.id !== currentUserId)?.description || 'Чат'}
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<VideoCallIcon />}
                    onClick={handleStartVideoCall}
                    sx={{ ml: 2 }}
                  >
                    Видеозвонок
                  </Button>
                </Box>

                {/* Область сообщений */}
                <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                  {messagesLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : messages.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 4 }}>
                      <Typography variant="h4" sx={{ mb: 2 }}>💬</Typography>
                      <Typography variant="h6" gutterBottom>
                        Начните разговор
                      </Typography>
                      <Typography color="text.secondary">
                        Отправьте первое сообщение в этом чате
                      </Typography>
                    </Box>
                  ) : (
                    <List>
                      {Array.isArray(messages) && messages.map((message) => (
                        <ListItem
                          key={message.id}
                          sx={{
                            flexDirection: 'column',
                            alignItems: isMyMessage(message) ? 'flex-end' : 'flex-start',
                          }}
                        >
                          <Box sx={{ 
                            maxWidth: '70%',
                            backgroundColor: isMyMessage(message) ? 'primary.main' : 'grey.100',
                            color: isMyMessage(message) ? 'primary.contrastText' : 'text.primary',
                            borderRadius: 2,
                            p: 2,
                            mb: 1
                          }}>
                            {!isMyMessage(message) && (
                              <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block', mb: 0.5 }}>
                                {message.user?.description || 'Неизвестный пользователь'}
                              </Typography>
                            )}
                            <Typography variant="body1">{message.text}</Typography>
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                              {formatMessageTime(message.created_at)}
                            </Typography>
                          </Box>
                        </ListItem>
                      ))}
                    </List>
                  )}
                  <div ref={messagesEndRef} />
                </Box>

                {/* Форма отправки сообщения */}
                <Box
                  component="form"
                  onSubmit={handleSendMessage}
                  sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}
                >
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      fullWidth
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Введите сообщение..."
                    />
                    <IconButton
                      type="submit"
                      color="primary"
                      disabled={!newMessage.trim()}
                    >
                      <SendIcon />
                    </IconButton>
                  </Box>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100%',
                }}
              >
                <Typography variant="h4" sx={{ mb: 2 }}>💬</Typography>
                <Typography variant="h6" gutterBottom>
                  Выберите чат
                </Typography>
                <Typography color="text.secondary">
                  Выберите чат слева для начала общения
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Container>

      {/* Компонент видеозвонка - всегда рендерим если есть activeCallId */}
      {activeCallId && (
        <VideoCallWithTranscript
          callId={activeCallId}
          onEndCall={handleEndVideoCall}
          isIncoming={!!incomingCall || isIncomingCall}
          shouldStartCall={isVideoCallActive}
          showUI={isVideoCallActive}
        />
      )}
    </>
  );
}; 