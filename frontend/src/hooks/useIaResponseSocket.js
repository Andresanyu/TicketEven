import { useEffect, useRef, useState, useMemo } from 'react';
import { getSocketConnection } from '../services/socketClient.js';

export function useIaResponseSocket(paymentSettled = false) {
  const [iaMessage, setIaMessage]     = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const bufferedMessage               = useRef(null);

  useEffect(() => {
    const socket = getSocketConnection();

    const handleConnect      = () => setIsConnected(true);
    const handleDisconnect   = (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') socket.connect();
    };
    const handleConnectError = (err) => {
      setIsConnected(false);
      console.error('Socket connect_error:', err?.message || err);
    };
    const handleAIResponse = (payload) => {
      const text = payload?.respuesta ?? payload?.message ?? '';
      bufferedMessage.current = text;   // siempre guarda, sin importar el estado
      setIaMessage(text);
      setIsLoading(false);
    };

    socket.on('connect',       handleConnect);
    socket.on('disconnect',    handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('ia_response',   handleAIResponse);

    if (!socket.connected) socket.connect();
    else setIsConnected(true);

    return () => {
      socket.off('connect',       handleConnect);
      socket.off('disconnect',    handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('ia_response',   handleAIResponse);
    };
  }, []);

  useEffect(() => {
    if (paymentSettled) {
      // Si el mensaje ya llegó antes de que el panel se mostrara, úsalo
      if (bufferedMessage.current) {
        setIaMessage(bufferedMessage.current);
        setIsLoading(false);
      } else {
        setIaMessage(null);
        setIsLoading(true);
      }
    } else {
      setIsLoading(false);
    }
  }, [paymentSettled]);

  const connectionLabel = useMemo(() => {
    if (isConnected) return 'En vivo';
    if (isLoading)   return 'Esperando IA';
    return 'Conectando';
  }, [isConnected, isLoading]);

  return {
    iaMessage,
    isLoading,
    isConnected,
    connectionLabel,
    resetIaMessage: () => {
      bufferedMessage.current = null;
      setIaMessage(null);
      setIsLoading(false);
    },
  };
}