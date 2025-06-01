import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  List,
  ListItem,
  Chip,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  CallEnd as CallEndIcon,
} from '@mui/icons-material';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface VideoCallWithTranscriptProps {
  callId: string;
  onEndCall: () => void;
  isIncoming?: boolean;
}

interface TranscriptEntry {
  user_id: string;
  text: string;
  timestamp: string;
}

export const VideoCallWithTranscript: React.FC<VideoCallWithTranscriptProps> = ({
  callId,
  onEndCall,
  isIncoming = false,
}) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isCallActive, setIsCallActive] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);

  // WebRTC хук для видеозвонка
  const {
    localStream,
    remoteStream,
    isConnected,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    handleSignal,
  } = useWebRTC((signal) => {
    // Отправляем WebRTC сигналы через WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'webrtc-signal',
        signal: signal,
      }));
    }
  });

  // Хук для распознавания речи
  const {
    isListening,
    transcript: currentTranscript,
    startListening,
    stopListening,
  } = useSpeechRecognition((text) => {
    // Отправляем транскрипт через WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'speech-transcript',
        text: text,
        timestamp: new Date().toISOString(),
      }));
    }
  });

  // Подключение к WebSocket
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      setError('Токен авторизации не найден');
      return;
    }

    console.log('Setting up WebSocket connection for callId:', callId);
    
    // Используем localhost:8080 для development, так как бэкенд запущен на этом порту
    const websocketUrl = `ws://localhost:8080/api/v1/call/${callId}/ws?token=${token}`;

    const websocket = new WebSocket(websocketUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
      setIsWebSocketConnected(true);
      setError(null);
    };

    websocket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('Received WebSocket message:', data);

        switch (data.type) {
          case 'webrtc-signal':
            // Обрабатываем WebRTC сигналы
            await handleSignal(data.signal);
            break;

          case 'transcript':
            // Добавляем новый транскрипт
            setTranscript(prev => [...prev, {
              user_id: data.user_id,
              text: data.text,
              timestamp: data.timestamp,
            }]);
            break;

          case 'call-ended':
            // Звонок завершен
            setIsCallActive(false);
            onEndCall();
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    websocket.onclose = (event) => {
      console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
      setWs(null);
      setIsWebSocketConnected(false);
      isInitializedRef.current = false; // Сбрасываем инициализацию при закрытии соединения
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Ошибка подключения WebSocket');
      setIsWebSocketConnected(false);
      isInitializedRef.current = false; // Сбрасываем инициализацию при ошибке
    };

    return () => {
      console.log('Cleaning up WebSocket connection');
      websocket.close();
    };
  }, [callId]);

  // Автоскролл транскрипта
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Начинаем звонок и распознавание речи
  useEffect(() => {
    const initializeCall = async () => {
      if (isInitializedRef.current) {
        return; // Уже инициализирован
      }

      try {
        console.log('Initializing call...', { 
          isWebSocketConnected, 
          isIncoming, 
          isInitialized: isInitializedRef.current 
        });
        
        if (isWebSocketConnected) {
          isInitializedRef.current = true;
          
          // Для исходящих звонков сначала запускаем WebRTC
          if (!isIncoming) {
            console.log('Starting WebRTC call...');
            await startCall();
            // Запускаем распознавание речи после успешного запуска WebRTC
            console.log('Starting speech recognition after WebRTC...');
            setTimeout(() => {
              startListening();
            }, 2000); // Увеличиваем задержку до 2 секунд
          } else {
            // Для входящих звонков сразу запускаем распознавание речи
            startListening();
          }
        }
      } catch (error) {
        console.error('Error initializing call:', error);
        setError('Ошибка инициализации звонка');
        isInitializedRef.current = false; // Сбрасываем флаг при ошибке
      }
    };

    if (isWebSocketConnected && !isInitializedRef.current) {
      initializeCall();
    }

    return () => {
      // Сбрасываем инициализацию при размонтировании
      isInitializedRef.current = false;
    };
  }, [isWebSocketConnected, isIncoming]); // Убираем функции из зависимостей

  const handleEndCall = useCallback(() => {
    // Отправляем сигнал завершения звонка
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call-end',
      }));
    }

    endCall();
    stopListening();
    setIsCallActive(false);
    isInitializedRef.current = false; // Сбрасываем флаг инициализации
    onEndCall();
  }, [ws, endCall, stopListening, onEndCall]);

  const handleToggleAudio = useCallback(() => {
    toggleAudio();
    setAudioEnabled(!audioEnabled);
  }, [toggleAudio, audioEnabled]);

  const handleToggleVideo = useCallback(() => {
    toggleVideo();
    setVideoEnabled(!videoEnabled);
  }, [toggleVideo, videoEnabled]);

  if (error) {
    return (
      <Dialog open={true} onClose={onEndCall} maxWidth="sm" fullWidth>
        <DialogTitle>Ошибка видеозвонка</DialogTitle>
        <DialogContent>
          <Alert severity="error">{error}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onEndCall} variant="contained">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  if (!isCallActive) {
    return (
      <Dialog open={true} onClose={onEndCall} maxWidth="sm" fullWidth>
        <DialogTitle>Звонок завершен</DialogTitle>
        <DialogContent>
          <Typography>Видеозвонок был завершен</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onEndCall} variant="contained">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: 'black',
      display: 'flex',
      zIndex: 9999,
    }}>
      {/* Видео область */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {/* Удаленное видео */}
        <Box
          component="video"
          ref={(video: HTMLVideoElement) => {
            if (video && remoteStream) {
              video.srcObject = remoteStream;
            }
          }}
          autoPlay
          playsInline
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            bgcolor: 'grey.900',
          }}
        />

        {/* Локальное видео (картинка в картинке) */}
        <Paper sx={{
          position: 'absolute',
          top: 2,
          right: 2,
          width: 192,
          height: 144,
          overflow: 'hidden',
          bgcolor: 'grey.800',
        }}>
          <Box
            component="video"
            ref={(video: HTMLVideoElement) => {
              if (video && localStream) {
                video.srcObject = localStream;
              }
            }}
            autoPlay
            playsInline
            muted
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </Paper>

        {/* Статус подключения */}
        <Box sx={{ position: 'absolute', top: 2, left: 2 }}>
          <Chip
            icon={<Box sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: isConnected ? 'success.main' : 'error.main',
            }} />}
            label={isConnected ? 'Подключено' : 'Подключение...'}
            color={isConnected ? 'success' : 'error'}
            variant="filled"
          />
        </Box>

        {/* Индикатор распознавания речи */}
        {isListening && (
          <Box sx={{ position: 'absolute', bottom: 10, left: 2 }}>
            <Chip
              icon={<Box sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: 'error.main',
                animation: 'pulse 1s infinite',
              }} />}
              label="Распознавание речи активно"
              color="error"
              variant="filled"
            />
          </Box>
        )}

        {/* Текущий транскрипт */}
        {currentTranscript && (
          <Paper sx={{
            position: 'absolute',
            bottom: 16,
            left: 2,
            right: 2,
            p: 2,
            bgcolor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
          }}>
            <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
              Вы говорите:
            </Typography>
            <Typography variant="body2">{currentTranscript}</Typography>
          </Paper>
        )}

        {/* Кнопки управления */}
        <Box sx={{
          position: 'absolute',
          bottom: 2,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 2,
        }}>
          <IconButton
            onClick={handleToggleAudio}
            sx={{
              bgcolor: audioEnabled ? 'grey.700' : 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: audioEnabled ? 'grey.600' : 'error.dark',
              },
            }}
          >
            {audioEnabled ? <MicIcon /> : <MicOffIcon />}
          </IconButton>
          <IconButton
            onClick={handleToggleVideo}
            sx={{
              bgcolor: videoEnabled ? 'grey.700' : 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: videoEnabled ? 'grey.600' : 'error.dark',
              },
            }}
          >
            {videoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
          </IconButton>
          <IconButton
            onClick={handleEndCall}
            sx={{
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'error.dark',
              },
            }}
          >
            <CallEndIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Панель транскрипта */}
      <Paper sx={{ width: 384, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">Транскрипт разговора</Typography>
        </Box>

        <Box
          ref={transcriptRef}
          sx={{ flex: 1, p: 2, overflow: 'auto' }}
        >
          {transcript.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                Транскрипт появится здесь во время разговора
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0 }}>
              {transcript.map((entry, index) => (
                <ListItem key={index} sx={{ px: 0, py: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, width: '100%' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                      Пользователь {entry.user_id.slice(0, 8)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </Typography>
                  </Box>
                  <Paper variant="outlined" sx={{ p: 1.5, width: '100%', borderLeft: 3, borderLeftColor: 'primary.main' }}>
                    <Typography variant="body2">{entry.text}</Typography>
                  </Paper>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Paper>
    </Box>
  );
}; 