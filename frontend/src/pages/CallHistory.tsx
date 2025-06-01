import React, { useEffect, useState } from 'react';
import { CallService } from '../api/call';
import type { CallWithTranscript } from '../api/call';

export const CallHistory = () => {
  const [calls, setCalls] = useState<CallWithTranscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallWithTranscript | null>(null);

  useEffect(() => {
    loadCallHistory();
  }, []);

  const loadCallHistory = async () => {
    try {
      setLoading(true);
      const response = await CallService.getCallHistory();
      setCalls(response);
    } catch (err) {
      setError('Ошибка загрузки истории звонков');
      console.error('Error loading call history:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (startTime: string, endTime?: string) => {
    if (!endTime) return 'Активный';
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.floor((end.getTime() - start.getTime()) / 1000);
    
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCallStatus = (call: CallWithTranscript['call']) => {
    switch (call.status) {
      case 'active':
        return { text: 'Активный', color: 'text-green-600' };
      case 'ended':
        return { text: 'Завершен', color: 'text-gray-600' };
      default:
        return { text: call.status, color: 'text-gray-600' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Загрузка истории звонков...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadCallHistory}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">История звонков</h1>
          <p className="mt-2 text-gray-600">
            Просмотр прошлых видеозвонков и их транскриптов
          </p>
        </div>

        {calls.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📞</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Нет истории звонков
            </h3>
            <p className="text-gray-600">
              Ваши видеозвонки будут отображаться здесь
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Список звонков */}
            <div className="space-y-4">
              {calls.map((callWithTranscript) => {
                const { call, transcript } = callWithTranscript;
                const status = getCallStatus(call);
                
                return (
                  <div
                    key={call.id}
                    className={`bg-white rounded-lg shadow p-6 cursor-pointer transition-all hover:shadow-md ${
                      selectedCall?.call.id === call.id ? 'ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setSelectedCall(callWithTranscript)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="flex -space-x-2">
                            {call.participants.slice(0, 3).map((participant, index) => (
                              <div
                                key={participant.id}
                                className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium border-2 border-white"
                                title={participant.description}
                              >
                                {participant.description.charAt(0).toUpperCase()}
                              </div>
                            ))}
                            {call.participants.length > 3 && (
                              <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white">
                                +{call.participants.length - 3}
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">
                              {call.participants.length === 2 
                                ? call.participants.find(p => p.id !== 'current-user')?.description || 'Звонок'
                                : `Групповой звонок (${call.participants.length} участников)`
                              }
                            </h3>
                            <p className="text-sm text-gray-500">
                              {new Date(call.created_at).toLocaleString('ru-RU')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className={`font-medium ${status.color}`}>
                            {status.text}
                          </span>
                          <span className="text-gray-500">
                            {formatDuration(call.created_at, call.ended_at ?? undefined)}
                          </span>
                        </div>

                        {transcript.length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
                            <p className="text-gray-600 line-clamp-2">
                              {transcript[0].text}
                              {transcript.length > 1 && '...'}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {transcript.length} сообщений в транскрипте
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Детали выбранного звонка */}
            <div className="lg:sticky lg:top-8">
              {selectedCall ? (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      Детали звонка
                    </h2>
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">Дата:</span>{' '}
                        {new Date(selectedCall.call.created_at).toLocaleString('ru-RU')}
                      </p>
                      <p>
                        <span className="font-medium">Длительность:</span>{' '}
                        {formatDuration(selectedCall.call.created_at, selectedCall.call.ended_at ?? undefined)}
                      </p>
                      <p>
                        <span className="font-medium">Участники:</span>{' '}
                        {selectedCall.call.participants.map(p => p.description).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      Транскрипт разговора
                    </h3>
                    
                    {selectedCall.transcript.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        Транскрипт недоступен
                      </p>
                    ) : (
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {selectedCall.transcript.map((entry, index) => {
                          const participant = selectedCall.call.participants.find(
                            p => p.id === entry.user.id
                          );
                          
                          return (
                            <div key={index} className="border-l-4 border-blue-500 pl-4">
                              <div className="flex items-center space-x-2 mb-1">
                                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                                  {entry.user.description.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium text-gray-900">
                                  {entry.user.description}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {new Date(entry.timestamp).toLocaleTimeString('ru-RU')}
                                </span>
                              </div>
                              <p className="text-gray-700">{entry.text}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow p-6 text-center">
                  <div className="text-gray-400 text-4xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Выберите звонок
                  </h3>
                  <p className="text-gray-600">
                    Нажмите на звонок слева, чтобы просмотреть детали и транскрипт
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 