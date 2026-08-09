import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:3000'); // ตรงกับ port ของ server
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return socketRef.current;
}