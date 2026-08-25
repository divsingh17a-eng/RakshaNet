import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../api/client';
import { useAuthStore } from '../store/authStore';

const SocketContext = createContext({ socket: null, connected: false });

/**
 * Owns the single Socket.io connection for the live operational feed
 * (docs/API.md "Live feed"). Connects once a JWT is available and tears
 * down on logout. Pages subscribe to individual events via useSocketEvent.
 */
export function SocketProvider({ children }) {
  const token = useAuthStore((s) => s.token);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return undefined;
    }

    const socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

/**
 * Subscribes to one Socket.io event for the lifetime of the calling
 * component. Re-subscribes if the socket instance changes (e.g. reconnect).
 */
export function useSocketEvent(eventName, handler) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return undefined;
    socket.on(eventName, handler);
    return () => socket.off(eventName, handler);
  }, [socket, eventName, handler]);
}
