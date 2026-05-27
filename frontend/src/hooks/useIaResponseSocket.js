import { useEffect, useMemo, useState } from 'react';
import { getSocketConnection } from '../services/socketClient.js';

export function useIaResponseSocket(isActive = false) {
  const [iaPayload, setIaPayload] = useState(null);
  const [iaMessage, setIaMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(isActive));

  // 1. Efecto principal: Conexión y escucha de mensajes
  useEffect(() => {
    const socket = getSocketConnection();

    const handleConnect = () => {
      setIsConnected(true);
    };

    const handleDisconnect = (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    };

    const handleConnectError = (error) => {
      setIsConnected(false);
      console.error('Socket.io connect_error:', error?.message || error);
    };

    const handleAIResponse = (payload) => {
      const responseText = payload?.respuesta ?? payload?.message ?? '';
      setIaPayload(payload ?? null);
      setIaMessage(responseText);
      
      setIsLoading(false);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('ia_response', handleAIResponse);

    if (!socket.connected) {
      socket.connect();
    } else {
      setIsConnected(true);
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('ia_response', handleAIResponse);
    };
  }, []);

  // 2. Efecto secundario: Mantener el estado de carga alineado con la transacción activa
  useEffect(() => {
    if (isActive) {
      if (!iaPayload) {
        setIaMessage(null);
        setIsLoading(true);
      }
    } else {
      setIsLoading(false);
    }
  }, [isActive, iaPayload]);

  const connectionLabel = useMemo(() => {
    if (isConnected) return 'En vivo';
    if (isLoading) return 'Esperando IA';
    return 'Conectando';
  }, [isConnected, isLoading]);

  return {
    iaPayload,
    iaMessage,
    isLoading,
    isConnected,
    connectionLabel,
    resetIaMessage: () => {
      setIaPayload(null);
      setIaMessage(null);
      setIsLoading(false);
    },
  };
}