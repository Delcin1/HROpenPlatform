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
  Grid,
  ListItemText,
} from '@mui/material';
import {
  Mic as MicIcon,
  MicOff as MicOffIcon,
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  CallEnd as CallEndIcon,
} from '@mui/icons-material';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSharedSpeechRecognition } from '../hooks/useSharedSpeechRecognition';

interface VideoCallWithTranscriptProps {
  callId: string;
  onEndCall: () => void;
  isIncoming?: boolean;
  shouldStartCall?: boolean;
  showUI?: boolean;
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
  shouldStartCall = true,
  showUI = true,
}) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [isCallActive, setIsCallActive] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const isInitializedRef = useRef(false);
  
  // Рефы для управления speech recognition
  const speechStartedRef = useRef(false);
  const restartCountRef = useRef(0);
  const maxRestarts = isIncoming ? 3 : 5; // Меньше попыток для входящих звонков

  // Коллбек для обработки транскрипта
  const handleTranscript = useCallback((text: string) => {
    if (text.trim() && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('📝 Sending transcript:', text);
      
      const message = JSON.stringify({
        type: 'speech-transcript',
        text: text,
        timestamp: new Date().toISOString(),
      });
      
      wsRef.current.send(message);
    }
  }, []); // Пустые зависимости - функция стабильна

  // Основная инициализация WebRTC
  const {
    localStream,
    remoteStream,
    isConnected,
    startCall,
    endCall,
    toggleAudio,
    toggleVideo,
    handleSignal,
    getAudioStream,
  } = useWebRTC((signal) => {
    // Отправляем WebRTC сигналы через WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'webrtc-signal',
        signal: signal,
      }));
      console.log('📤 Sent WebRTC signal:', signal.type);
    } else {
      console.error('❌ WebSocket not ready for signal:', signal.type);
    }
  }, isIncoming);

  // Хук для распознавания речи
  const {
    isListening,
    transcript: currentTranscript,
    startListening,
    stopListening,
  } = useSharedSpeechRecognition(handleTranscript);

  // Отслеживаем состояние isListening для сброса флага при остановке
  const prevIsListeningRef = useRef(isListening);
  useEffect(() => {
    const wasListening = prevIsListeningRef.current;
    const isCurrentlyListening = isListening;
    
    // Если речевое распознавание остановилось (было активно, стало неактивно)
    if (wasListening && !isCurrentlyListening) {
      console.log('🎤 Speech recognition stopped, resetting speechStartedRef');
      speechStartedRef.current = false;
      
      // Простой автоматический перезапуск через задержку
      if (isConnected && isInitializedRef.current && shouldStartCall) {
        if (restartCountRef.current < maxRestarts) {
          console.log(`🔄 Auto-restart speech recognition (${restartCountRef.current + 1}/${maxRestarts})`);
          restartCountRef.current += 1;
          const restartDelay = isIncoming ? 3000 : 1500; // Умеренные задержки
          setTimeout(() => {
            // Дополнительная проверка перед перезапуском
            if (!speechStartedRef.current && !isListening && isConnected && isInitializedRef.current && shouldStartCall) {
              console.log('🔄 Auto-restarting speech recognition...');
              speechStartedRef.current = true;
              const audioStream = getAudioStream();
              if (audioStream) {
                startListening(audioStream);
              } else {
                console.warn('⚠️ No audio stream for restart, resetting speechStarted');
                speechStartedRef.current = false;
              }
            } else {
              console.log('⚠️ Auto-restart conditions not met', {
                speechStarted: speechStartedRef.current,
                isListening,
                isConnected,
                isInitialized: isInitializedRef.current,
                shouldStartCall
              });
            }
          }, restartDelay);
        } else {
          console.log('⚠️ Max restart attempts reached for auto-restart');
        }
      }
    }
    
    prevIsListeningRef.current = isListening;
  }, [isListening, isConnected, shouldStartCall, getAudioStream, startListening, isIncoming]);

  // Подключение к WebSocket
  useEffect(() => {
    let websocket: WebSocket | null = null;
    let isMounted = true;
    let connectionAttempted = false; // Флаг для предотвращения повторных подключений

    const setupWebSocket = async () => {
      // Предотвращаем множественные попытки подключения
      if (connectionAttempted) {
        console.log('WebSocket connection already attempted, skipping...');
        return;
      }
      
      // Проверяем что нет активного соединения
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected, skipping...');
        setIsWebSocketConnected(true);
        return;
      }
      
      connectionAttempted = true;

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Токен авторизации не найден');
        return;
      }

      if (!isMounted) return; // Предотвращаем настройку если компонент уже размонтирован

      console.log('Setting up WebSocket connection for callId:', callId);
      
      // Используем localhost:8080 для development, так как бэкенд запущен на этом порту
      const websocketUrl = `ws://localhost:8080/api/v1/call/${callId}/ws?token=${token}`;

      websocket = new WebSocket(websocketUrl);

      websocket.onopen = () => {
        if (!isMounted) {
          websocket?.close();
          return;
        }
        console.log('WebSocket connected');
        wsRef.current = websocket;
        setIsWebSocketConnected(true);
        setError(null);
      };

      websocket.onmessage = async (event) => {
        if (!isMounted) return;
        
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);

          switch (data.type) {
            case 'webrtc-signal':
              // Обрабатываем WebRTC сигналы
              console.log('📥 Received WebRTC signal:', data.signal.type, data.signal);
              try {
                await handleSignal(data.signal);
                console.log('✅ WebRTC signal processed successfully');
              } catch (error) {
                console.error('❌ Error processing WebRTC signal:', error);
              }
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
              if (isMounted) {
                setIsCallActive(false);
                onEndCall();
              }
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = (event) => {
        console.log('WebSocket disconnected', { code: event.code, reason: event.reason });
        if (isMounted) {
          wsRef.current = null;
          setIsWebSocketConnected(false);
          isInitializedRef.current = false; // Сбрасываем инициализацию при закрытии соединения
        }
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        if (isMounted) {
          console.log('🔄 WebSocket error detected, will retry connection...');
          // НЕ устанавливаем ошибку сразу - дадим возможность переподключиться
        }
      };
    };

    setupWebSocket();

    return () => {
      console.log('Cleaning up WebSocket connection');
      isMounted = false;
      isInitializedRef.current = false;
      if (websocket) {
        if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
          websocket.close();
        }
      }
    };
  }, [callId]); // Только callId в зависимостях

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
          shouldStartCall,
          isInitialized: isInitializedRef.current 
        });
        
        if (isWebSocketConnected && shouldStartCall) {
          isInitializedRef.current = true;
          
          // Запускаем WebRTC для любого типа звонка
          console.log('Starting WebRTC call...');
          await startCall();
          
          // ОТКЛАДЫВАЕМ запуск распознавания речи до установления соединения
          console.log('WebRTC started, waiting for connection before speech recognition...');
        }
      } catch (error) {
        console.error('Error initializing call:', error);
        setError('Ошибка инициализации звонка');
        isInitializedRef.current = false; // Сбрасываем флаг при ошибке
      }
    };

    if (isWebSocketConnected && shouldStartCall && !isInitializedRef.current) {
      initializeCall();
    }
  }, [isWebSocketConnected, isIncoming, shouldStartCall]);

  // Отдельный эффект для запуска речевого распознавания после установления WebRTC соединения
  useEffect(() => {
    if (isConnected && isInitializedRef.current && shouldStartCall && !speechStartedRef.current) {
      console.log('WebRTC connected! Starting speech recognition with delay...', {
        isConnected,
        isInitialized: isInitializedRef.current,
        shouldStartCall,
        speechStarted: speechStartedRef.current,
        isIncoming
      });
      speechStartedRef.current = true; // Предотвращаем повторные запуски
      
      // Добавляем задержку чтобы WebRTC полностью инициализировался
      const speechTimeout = setTimeout(() => {
        console.log('Attempting to start shared speech recognition...');
        try {
          const audioStream = getAudioStream();
          if (audioStream) {
            // Дополнительная проверка для входящих звонков
            if (isIncoming) {
              const audioTracks = audioStream.getAudioTracks();
              console.log('🔍 Audio track validation for incoming call:', {
                tracksCount: audioTracks.length,
                enabled: audioTracks[0]?.enabled,
                readyState: audioTracks[0]?.readyState,
                muted: audioTracks[0]?.muted
              });
              
              // Ждем еще немного если трек не готов
              if (audioTracks.length === 0 || audioTracks[0]?.readyState !== 'live') {
                console.warn('⚠️ Audio track not ready for incoming call, retrying...');
                speechStartedRef.current = false;
                setTimeout(() => {
                  const retryStream = getAudioStream();
                  if (retryStream) {
                    console.log('🔄 Retry starting speech recognition for incoming call');
                    speechStartedRef.current = true;
                    startListening(retryStream);
                    restartCountRef.current = 0; // Сбрасываем счетчик при успешном retry
                  }
                }, 3000);
                return;
              }
            }
            
            console.log('✅ Audio stream available, starting speech recognition');
            startListening(audioStream);
            console.log('✅ Shared speech recognition started with WebRTC audio stream');
            restartCountRef.current = 0; // Сбрасываем счетчик при успешном запуске
          } else {
            console.warn('⚠️ No audio stream available for speech recognition');
            speechStartedRef.current = false; // Сбрасываем если не удалось запустить
          }
        } catch (error) {
          console.error('Failed to start speech recognition:', error);
          speechStartedRef.current = false; // Сбрасываем при ошибке
        }
      }, isIncoming ? 8000 : 3000); // Для входящих звонков увеличиваем задержку до 8 секунд

      return () => {
        clearTimeout(speechTimeout);
      };
    } else {
      console.log('Speech recognition conditions not met:', {
        isConnected,
        isInitialized: isInitializedRef.current,
        shouldStartCall,
        speechStarted: speechStartedRef.current,
        isIncoming,
        isListening,
        hasAudioStream: !!getAudioStream()
      });
    }
  }, [isConnected, shouldStartCall, startListening, getAudioStream, isIncoming]);

  const handleEndCall = useCallback(() => {
    console.log('📞 Ending call...');
    
    // Сначала помечаем что звонок завершается
    isInitializedRef.current = false;
    speechStartedRef.current = false; // Сбрасываем флаг речевого распознавания
    
    // Останавливаем распознавание речи
    try {
      stopListening();
      console.log('🎤 Speech recognition stopped');
    } catch (e) {
      console.error('Error stopping speech recognition:', e);
    }
    
    // Завершаем WebRTC звонок
    try {
      endCall();
      console.log('📞 WebRTC call ended');
    } catch (e) {
      console.error('Error ending WebRTC call:', e);
    }
    
    // Закрываем WebSocket
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔌 Closing WebSocket...');
      wsRef.current.close();
    }
    
    // Вызываем коллбек родительского компонента
    onEndCall?.();
  }, [endCall, onEndCall, stopListening]);

  const handleToggleAudio = useCallback(() => {
    toggleAudio();
    setAudioEnabled(!audioEnabled);
  }, [toggleAudio, audioEnabled]);

  const handleToggleVideo = useCallback(() => {
    toggleVideo();
    setVideoEnabled(!videoEnabled);
  }, [toggleVideo, videoEnabled]);

  // Принудительный перезапуск речевого распознавания (для отладки)
  const handleRestartSpeechRecognition = useCallback(() => {
    console.log('🔄 Manual restart of speech recognition...');
    speechStartedRef.current = false;
    restartCountRef.current = 0; // Сбрасываем счетчик при ручном перезапуске
    
    setTimeout(() => {
      const audioStream = getAudioStream();
      if (audioStream && isConnected) {
        console.log('🔄 Manual restart: starting speech recognition');
        speechStartedRef.current = true;
        startListening(audioStream);
      } else {
        console.warn('⚠️ Manual restart failed: no audio stream or not connected');
      }
    }, 500);
  }, [getAudioStream, isConnected, startListening]);

  // Cleanup при размонтировании
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up VideoCallWithTranscript...');
      
      // Сбрасываем все флаги
      isInitializedRef.current = false;
      speechStartedRef.current = false;
      
      // Закрываем WebSocket если он открыт
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('🔌 Closing WebSocket in cleanup...');
        wsRef.current.close();
      }
    };
  }, []); // Пустые зависимости

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

  if (!showUI) {
    return null;
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
          {/* Добавляем кнопку перезапуска для отладки */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
            <Chip
              size="small"
              label={isListening ? 'Активно' : 'Не активно'}
              color={isListening ? 'success' : 'error'}
            />
            <Button
              size="small"
              variant="outlined"
              onClick={handleRestartSpeechRecognition}
              disabled={!isConnected}
            >
              Перезапустить
            </Button>
          </Box>
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