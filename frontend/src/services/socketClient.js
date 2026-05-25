import { io } from 'socket.io-client';

function normalizeSocketUrl(value) {
  if (!value || typeof value !== 'string') return null;

  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return null;

  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}

function getRuntimeSocketUrl() {
  const fromEnv = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_SOCKET_URL : null;
  const fromApiEnv = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_API_BASE_URL : null;
  const fromStorage = typeof window !== 'undefined' ? window.localStorage?.getItem('SOCKET_URL') : null;
  const fromGlobal = typeof window !== 'undefined' ? window.API_BASE_URL : null;

  return (
    normalizeSocketUrl(fromEnv) ||
    normalizeSocketUrl(fromStorage) ||
    normalizeSocketUrl(fromApiEnv) ||
    normalizeSocketUrl(fromGlobal) ||
    'http://localhost:4001'
  );
}

const SOCKET_URL = getRuntimeSocketUrl();
let socketInstance = null;

export function getSocketConnection() {
  if (socketInstance) {
    return socketInstance;
  }

  socketInstance = io(SOCKET_URL, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1500,
    reconnectionDelayMax: 5000,
  });

  return socketInstance;
}

export { SOCKET_URL };
