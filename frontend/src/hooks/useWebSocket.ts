import { useEffect, useRef, useState } from 'react';

const WS_URL = 'ws://localhost:8080';

export const useWebSocket = (chatId: string | null) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!chatId) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      setIsConnected(false);
      return;
    }

    // Получаем токен из localStorage
    const token = localStorage.getItem('access_token');
    console.log('WebSocket: Checking token in localStorage:', token ? 'Token exists' : 'No token found');
    
    if (!token) {
      console.error('WebSocket: No auth token found in localStorage. Please login first.');
      setIsConnected(false);
      return;
    }

    // Создаем WebSocket соединение с токеном в URL
    const wsUrl = `${WS_URL}/api/v1/chat/${chatId}/ws?token=${encodeURIComponent(token)}`;
    console.log('WebSocket: Creating WebSocket connection to:', wsUrl);
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket: Connected successfully');
      setIsConnected(true);
    };

    ws.onclose = (event) => {
      console.log('WebSocket: Disconnected:', event.code, event.reason);
      setIsConnected(false);
    };

    ws.onerror = (error) => {
      console.error('WebSocket: Error:', error);
      setIsConnected(false);
    };

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('WebSocket: Closing connection');
        wsRef.current.close();
      }
      setIsConnected(false);
    };
  }, [chatId]);

  const sendMessage = (text: string) => {
    if (!wsRef.current) {
      console.error('WebSocket: Cannot send message - connection not initialized');
      return;
    }

    if (wsRef.current.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Sending message:', text);
      wsRef.current.send(text);
    } else {
      console.error('WebSocket: Cannot send message - connection not open');
    }
  };

  const onMessage = (callback: (data: any) => void) => {
    if (!wsRef.current) {
      console.error('WebSocket: Cannot set message handler - connection not initialized');
      return;
    }

    const handler = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket: Received message:', data);
        callback(data);
      } catch (error) {
        console.error('WebSocket: Error parsing message:', error);
      }
    };

    wsRef.current.addEventListener('message', handler);
    return () => {
      wsRef.current?.removeEventListener('message', handler);
    };
  };

  return { sendMessage, onMessage, isConnected };
}; 