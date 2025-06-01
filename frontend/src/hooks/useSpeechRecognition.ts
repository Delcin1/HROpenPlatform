import { useEffect, useRef, useState } from 'react';

interface SpeechRecognitionHook {
  isListening: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  isSupported: boolean;
}

export const useSpeechRecognition = (
  onTranscript?: (text: string) => void
): SpeechRecognitionHook => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<number | null>(null);

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
        setIsListening(true);
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
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        // Более интеллектуальная обработка ошибок
        switch (event.error) {
          case 'no-speech':
            console.log('No speech detected, continuing...');
            // Не перезапускаем - это нормальная ситуация
            break;
            
          case 'audio-capture':
            console.log('Audio capture error, retrying in 2 seconds...');
            setTimeout(() => {
              if (recognitionRef.current && !isListening) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.error('Failed to restart after audio-capture error:', e);
                }
              }
            }, 2000);
            break;
            
          case 'network':
            console.log('Network error in speech recognition, retrying in 5 seconds...');
            setTimeout(() => {
              if (recognitionRef.current && !isListening) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.error('Failed to restart after network error:', e);
                }
              }
            }, 5000);
            break;
            
          case 'aborted':
            console.log('Speech recognition aborted - likely due to microphone conflict');
            // Не перезапускаем при aborted
            break;
            
          case 'not-allowed':
            console.error('Microphone access not allowed');
            break;
            
          default:
            console.log(`Speech recognition error: ${event.error}, retrying in 3 seconds...`);
            setTimeout(() => {
              if (recognitionRef.current && !isListening) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.error('Failed to restart after unknown error:', e);
                }
              }
            }, 3000);
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
        
        // НЕ автоматически перезапускаем - оставляем это на усмотрение приложения
        // Автоматический перезапуск может вызывать конфликты
      };

      recognitionRef.current = recognition;
    } else {
      console.warn('Speech Recognition API not supported');
      setIsSupported(false);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [onTranscript, isListening]);

  const startListening = () => {
    if (recognitionRef.current && !isListening && isSupported) {
      try {
        console.log('Starting speech recognition...');
        recognitionRef.current.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
      }
    } else if (isListening) {
      console.log('Speech recognition already running');
    } else if (!isSupported) {
      console.warn('Speech recognition not supported');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      console.log('Stopping speech recognition...');
      recognitionRef.current.stop();
      setIsListening(false);
      setTranscript('');
    }
  };

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
    isSupported,
  };
}; 