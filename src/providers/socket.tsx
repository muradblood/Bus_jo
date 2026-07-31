import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { socket } from '@/lib/socket';

interface SocketContextValue {
  /** Whether Socket.IO is currently connected to the backend. */
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ connected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ connected }}>
      {children}
    </SocketContext.Provider>
  );
}

/** Returns the current Socket.IO connection state. */
export function useSocket() {
  return useContext(SocketContext);
}
