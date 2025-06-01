import React, { useEffect, useRef, useState } from 'react';
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
  const transcriptRef = useRef<HTMLDivElement>(null);

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
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const websocket = new WebSocket(
      `ws://localhost:8080/api/v1/call/${callId}/ws?token=${token}`
    );

    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
    };

    websocket.onmessage = async (event) => {
      const data = JSON.parse(event.data);

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
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      websocket.close();
    };
  }, [callId, handleSignal, onEndCall]);

  // Автоскролл транскрипта
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Начинаем звонок и распознавание речи
  useEffect(() => {
    if (ws && !isIncoming) {
      startCall();
    }
    startListening();

    return () => {
      stopListening();
    };
  }, [ws, isIncoming, startCall, startListening, stopListening]);

  const handleEndCall = () => {
    // Отправляем сигнал завершения звонка
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'call-end',
      }));
    }

    endCall();
    stopListening();
    setIsCallActive(false);
    onEndCall();
  };

  if (!isCallActive) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Звонок завершен</h2>
          <button
            onClick={onEndCall}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Закрыть
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex z-50">
      {/* Видео область */}
      <div className="flex-1 relative">
        {/* Удаленное видео */}
        <video
          ref={(video) => {
            if (video && remoteStream) {
              video.srcObject = remoteStream;
            }
          }}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Локальное видео (картинка в картинке) */}
        <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={(video) => {
              if (video && localStream) {
                video.srcObject = localStream;
              }
            }}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        </div>

        {/* Статус подключения */}
        <div className="absolute top-4 left-4 text-white">
          <div className={`flex items-center space-x-2 ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span>{isConnected ? 'Подключено' : 'Подключение...'}</span>
          </div>
        </div>

        {/* Индикатор распознавания речи */}
        {isListening && (
          <div className="absolute bottom-20 left-4 text-white">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <span>Распознавание речи активно</span>
            </div>
          </div>
        )}

        {/* Текущий транскрипт */}
        {currentTranscript && (
          <div className="absolute bottom-32 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded">
            <div className="text-sm opacity-75">Вы говорите:</div>
            <div>{currentTranscript}</div>
          </div>
        )}

        {/* Кнопки управления */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
          <button
            onClick={toggleAudio}
            className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white"
          >
            🎤
          </button>
          <button
            onClick={toggleVideo}
            className="w-12 h-12 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center text-white"
          >
            📹
          </button>
          <button
            onClick={handleEndCall}
            className="w-12 h-12 bg-red-600 hover:bg-red-700 rounded-full flex items-center justify-center text-white"
          >
            📞
          </button>
        </div>
      </div>

      {/* Панель транскрипта */}
      <div className="w-96 bg-white flex flex-col">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Транскрипт разговора</h3>
        </div>

        <div
          ref={transcriptRef}
          className="flex-1 p-4 overflow-y-auto space-y-3"
        >
          {transcript.map((entry, index) => (
            <div key={index} className="border-l-4 border-blue-500 pl-3">
              <div className="text-sm text-gray-500 mb-1">
                Пользователь {entry.user_id.slice(0, 8)} • {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
              <div className="text-gray-800">{entry.text}</div>
            </div>
          ))}

          {transcript.length === 0 && (
            <div className="text-gray-500 text-center py-8">
              Транскрипт появится здесь во время разговора
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 