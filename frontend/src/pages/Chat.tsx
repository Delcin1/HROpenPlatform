import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import { ChatService } from '../api/chat';
import type { ChatWithLastMessage, Message } from '../api/chat';
import { useWebSocket } from '../hooks/useWebSocket';

export const Chat = () => {
  const [searchParams] = useSearchParams();
  const initialChatId = searchParams.get('chatId');
  const [selectedChat, setSelectedChat] = useState<string | null>(initialChatId);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [wsError, setWsError] = useState<string | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const { data: chats, isLoading: chatsLoading, error: chatsError } = useQuery<ChatWithLastMessage[]>({
    queryKey: ['chats'],
    queryFn: async () => {
      try {
        const response = await ChatService.getUserChats();
        console.log('Server response:', response);
        console.log('Response type:', typeof response);
        
        // Проверяем, что response существует
        if (!response) {
          console.error('Response is null or undefined');
          return [];
        }

        // Если response это строка, пытаемся распарсить её как JSON
        let parsedResponse = response;
        if (typeof response === 'string') {
          try {
            parsedResponse = JSON.parse(response);
          } catch (e) {
            console.error('Failed to parse response as JSON:', e);
            return [];
          }
        }

        // Проверяем, что распарсенный ответ является массивом
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

  const { data: chatMessages, isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ['messages', selectedChat],
    queryFn: async () => {
      if (!selectedChat) return [];
      try {
        const response = await ChatService.getChatMessages(selectedChat, 50, 0);
        // Проверяем, что response существует
        if (!response) {
          console.error('Messages response is null or undefined');
          return [];
        }

        // Если response это строка, пытаемся распарсить её как JSON
        let parsedResponse = response;
        if (typeof response === 'string') {
          try {
            parsedResponse = JSON.parse(response);
          } catch (e) {
            console.error('Failed to parse messages response as JSON:', e);
            return [];
          }
        }

        // Проверяем, что распарсенный ответ является массивом
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

  const { sendMessage, onMessage } = useWebSocket(selectedChat);

  // Отслеживаем состояние WebSocket соединения
  useEffect(() => {
    if (!selectedChat) {
      setIsWsConnected(false);
      setWsError(null);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setWsError('Требуется авторизация');
      setIsWsConnected(false);
      return;
    }

    const ws = new WebSocket(`ws://localhost:8080/api/v1/chat/${selectedChat}/ws?token=${token}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsWsConnected(true);
      setWsError(null);
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      setIsWsConnected(false);
      setWsError('Соединение потеряно. Попытка переподключения...');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsError('Ошибка соединения');
      setIsWsConnected(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [selectedChat]);

  useEffect(() => {
    if (chatMessages) {
      setMessages(Array.isArray(chatMessages) ? chatMessages : []);
    }
  }, [chatMessages]);

  useEffect(() => {
    if (selectedChat) {
      const unsubscribe = onMessage((message: Message) => {
        setMessages((prev) => {
          if (!Array.isArray(prev)) return [message];
          if (prev.some(m => m.id === message.id)) {
            return prev;
          }
          return [message, ...prev];
        });
      });
      return unsubscribe;
    }
  }, [selectedChat, onMessage]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageText.trim() && selectedChat) {
      try {
        sendMessage(messageText.trim());
        setMessageText('');
        setWsError(null);
      } catch (error) {
        setWsError('Ошибка при отправке сообщения');
        console.error('Error sending message:', error);
      }
    }
  };

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
    <Container maxWidth="lg" sx={{ mt: 4, height: 'calc(100vh - 100px)' }}>
      <Box sx={{ display: 'flex', height: '100%', gap: 2 }}>
        {/* Chat List */}
        <Paper sx={{ width: 300, overflow: 'auto' }}>
          <List>
            {Array.isArray(chats) && chats.map((chat) => (
              <ListItem
                key={chat.chat.id}
                button
                selected={selectedChat === chat.chat.id}
                onClick={() => setSelectedChat(chat.chat.id)}
              >
                <ListItemAvatar>
                  <Badge badgeContent={chat.unread_count} color="primary">
                    <Avatar />
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={chat.chat.users.join(', ')}
                  secondary={chat.last_message?.text}
                />
              </ListItem>
            ))}
          </List>
        </Paper>

        {/* Chat Messages */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {selectedChat ? (
            <>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="h6">
                  {Array.isArray(chats) && chats.find((c) => c.chat.id === selectedChat)?.chat.users.join(', ')}
                </Typography>
                {!isWsConnected && (
                  <Typography variant="caption" color="error">
                    Соединение потеряно
                  </Typography>
                )}
              </Box>

              {wsError && (
                <Alert severity="error" sx={{ m: 2 }}>
                  {wsError}
                </Alert>
              )}

              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {messagesLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <List>
                    {Array.isArray(messages) && messages.map((message) => (
                      <ListItem
                        key={message.id}
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          {new Date(message.created_at).toLocaleString()}
                        </Typography>
                        <Typography>{message.text}</Typography>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              <Box
                component="form"
                onSubmit={handleSendMessage}
                sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}
              >
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Введите сообщение..."
                    disabled={!isWsConnected}
                  />
                  <IconButton
                    type="submit"
                    color="primary"
                    disabled={!messageText.trim() || !isWsConnected}
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
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
              }}
            >
              <Typography color="text.secondary">
                Выберите чат для начала общения
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}; 