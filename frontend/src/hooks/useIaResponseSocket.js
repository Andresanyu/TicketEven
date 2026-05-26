import { useEffect, useMemo, useState } from 'react';
import { getSocketConnection } from '../services/socketClient.js';

export function useIaResponseSocket(paymentFailed = false) {
  const [iaPayload, setIaPayload] = useState(null);
  const [iaMessage, setIaMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(paymentFailed));

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
      if (payload?.estado === 'aprobado' || payload?.tipo_evento === 'pago_exitoso') {
        setSuccessMessage(responseText);
      }
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

  useEffect(() => {
    if (paymentFailed) {
      setIaPayload(null);
      setIaMessage(null);
      setSuccessMessage(null);
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [paymentFailed]);

  const connectionLabel = useMemo(() => {
    if (isConnected) return 'En vivo';
    if (isLoading) return 'Esperando IA';
    return 'Conectando';
  }, [isConnected, isLoading]);

  return {
    iaPayload,
    iaMessage,
    successMessage,
    isLoading,
    isConnected,
    connectionLabel,
    resetIaMessage: () => {
      setIaPayload(null);
      setIaMessage(null);
      setSuccessMessage(null);
      setIsLoading(false);
    },
  };
}
