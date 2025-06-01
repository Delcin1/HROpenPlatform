import { useEffect, useRef, useState } from 'react';

interface SharedSpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  startListening: (audioStream: MediaStream | null) => void;
  stopListening: () => void;
  isSupported: boolean;
}

export const useSharedSpeechRecognition = (
  onTranscript?: (text: string) => void
): SharedSpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const currentStreamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef<boolean>(false);
  const shouldBlockAutoRestartRef = useRef<boolean>(false); // Блокировка авто-перезапуска

  useEffect(() => {
    // Проверяем поддержку Speech Recognition API
    const SpeechRecognition = 
      window.SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'ru-RU';

      recognition.onstart = () => {
        console.log('🎤 Shared speech recognition started successfully');
        setIsListening(true);
        isStartingRef.current = false;
        shouldBlockAutoRestartRef.current = false; // Сбрасываем блокировку при успешном старте
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        // Обновляем текущий транскрипт
        setTranscript(interimTranscript || finalTranscript);

        // Если есть финальный результат, отправляем его
        if (finalTranscript && onTranscript) {
          console.log('🎤 Final transcript:', finalTranscript.trim());
          onTranscript(finalTranscript.trim());
          
          // Очищаем транскрипт через небольшую задержку
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = window.setTimeout(() => {
            setTranscript('');
          }, 1000);
        }
      };

      recognition.onerror = (event) => {
        console.error('❌ Shared speech recognition error:', event.error);
        setIsListening(false);
        isStartingRef.current = false;
        
        // Упрощенная обработка ошибок без агрессивных перезапусков
        switch (event.error) {
          case 'no-speech':
            console.log('🤫 No speech detected - this is normal');
            // Только ОДИН быстрый перезапуск при no-speech
            if (currentStreamRef.current && !isStartingRef.current) {
              setTimeout(() => {
                console.log('🔄 Single restart after no-speech...');
                if (currentStreamRef.current && !isStartingRef.current && !isListening) {
                  startListening(currentStreamRef.current);
                }
              }, 1000); // Уменьшаем задержку до 1 секунды
            }
            break;
            
          case 'audio-capture':
            console.log('🎤 Audio capture error - likely microphone conflict');
            // НЕ перезапускаем автоматически при audio-capture
            console.log('⚠️ Speech recognition stopped due to audio conflict');
            currentStreamRef.current = null; // Останавливаем автоматические перезапуски
            break;
            
          case 'network':
            console.log('🌐 Network error in speech recognition');
            // Блокируем автоматический перезапуск из onend при network ошибках
            shouldBlockAutoRestartRef.current = true;
            console.log('⚠️ Speech recognition paused due to network error - blocking auto-restart');
            break;
            
          case 'aborted':
            console.log('⏹️ Speech recognition aborted');
            // Не перезапускаем при aborted - это обычно намеренная остановка
            break;
            
          case 'not-allowed':
            console.error('🚫 Microphone access not allowed');
            break;
            
          default:
            console.log(`⚠️ Speech recognition error: ${event.error}`);
            // Только для неизвестных ошибок пытаемся перезапустить
            if (currentStreamRef.current && !isStartingRef.current && event.error !== 'network' && event.error !== 'audio-capture') {
              setTimeout(() => {
                console.log('🔄 Retrying after unknown error...');
                startListening(currentStreamRef.current);
              }, 5000);
            }
        }
      };

      recognition.onend = () => {
        console.log('🔚 Shared speech recognition ended');
        setIsListening(false);
        
        // Проверяем блокировку авто-перезапуска
        if (shouldBlockAutoRestartRef.current) {
          console.log('🚫 Auto-restart blocked due to previous error');
          shouldBlockAutoRestartRef.current = false; // Сбрасываем флаг
          return;
        }
        
        // Простой автоматический перезапуск если есть активный поток
        if (currentStreamRef.current && !isStartingRef.current) {
          console.log('🔄 Auto-restarting speech recognition after natural end...');
          setTimeout(() => {
            if (currentStreamRef.current && !isStartingRef.current && !isListening) {
              startListening(currentStreamRef.current);
            }
          }, 2000); // 2 секунды задержка
        } else {
          console.log('ℹ️ Speech recognition ended - no auto-restart (no stream or starting)');
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('⚠️ Speech Recognition API not supported');
      setIsSupported(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onTranscript]);

  const startListening = (audioStream: MediaStream | null) => {
    if (!audioStream) {
      console.warn('⚠️ No audio stream provided for speech recognition');
      return;
    }

    if (!recognitionRef.current || !isSupported) {
      console.warn('⚠️ Speech recognition not available');
      return;
    }

    if (isListening || isStartingRef.current) {
      console.log('🎤 Speech recognition already running or starting');
      return;
    }

    // Проверяем что аудио трек активен
    const audioTracks = audioStream.getAudioTracks();
    if (audioTracks.length === 0 || !audioTracks[0].enabled) {
      console.warn('⚠️ No active audio track in stream');
      return;
    }

    try {
      console.log('🎤 Starting shared speech recognition...');
      console.log('🔊 Audio stream info:', {
        tracks: audioTracks.length,
        enabled: audioTracks[0].enabled,
        readyState: audioTracks[0].readyState
      });
      
      // Сохраняем ссылку на поток
      currentStreamRef.current = audioStream;
      isStartingRef.current = true;
      
      // Запускаем распознавание речи
      // Speech Recognition API автоматически использует активный микрофон
      recognitionRef.current.start();
      
    } catch (error) {
      console.error('❌ Failed to start shared speech recognition:', error);
      isStartingRef.current = false;
    }
  };

  const stopListening = () => {
    console.log('🛑 Stopping shared speech recognition...');
    
    // Очищаем ссылку на поток чтобы остановить автоматические перезапуски
    currentStreamRef.current = null;
    isStartingRef.current = false;
    
    if (recognitionRef.current && (isListening || isStartingRef.current)) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.warn('⚠️ Error stopping speech recognition:', error);
      }
    }
    
    setIsListening(false);
    setTranscript('');
  };

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  };
}; 