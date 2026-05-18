import { io, Socket } from 'socket.io-client';
import env from '@/config/env';

/**
 * socket.io client for real-time order status updates.
 * Namespace: /orders
 * Auth: Supabase JWT in handshake.
 */
let socket: Socket | null = null;

/**
 * Get or create the socket connection.
 * Must be called after authentication to attach the JWT.
 */
export function getSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  const baseUrl = env.API_URL.replace('/api', '');

  socket = io(`${baseUrl}/orders`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  return socket;
}

/**
 * Disconnect the socket.
 * Called on logout.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
