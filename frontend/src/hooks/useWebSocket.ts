import { useEffect, useRef } from 'react';

const WS_URL = 'ws://localhost:8080';

export const useWebSocket = (chatId: string | null) => {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!chatId) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      return;
    }

    // Получаем токен из localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No auth token found in localStorage');
      return;
    }

    // Создаем WebSocket с токеном в URL
    const ws = new WebSocket(`${WS_URL}/api/v1/chat/${chatId}/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [chatId]);

  const sendMessage = (text: string) => {
    if (!wsRef.current) {
      console.error('WebSocket is not initialized');
      return;
    }

    if (wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(text);
    } else {
      console.error('WebSocket is not connected');
    }
  };

  const onMessage = (callback: (data: any) => void) => {
    if (!wsRef.current) return;

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };

    wsRef.current.addEventListener('message', handler);
    return () => {
      wsRef.current?.removeEventListener('message', handler);
    };
  };

  return { sendMessage, onMessage };
}; 