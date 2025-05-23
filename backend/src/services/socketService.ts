import type { Server as SocketIOServer, Socket } from 'socket.io';

export const setupSocketHandlers = (io: SocketIOServer): void => {
  io.on('connection', (socket: Socket) => {
    console.info(`Client connected: ${socket.id}`);
    
    socket.emit('welcome', {
      message: 'Connected to Planning Poker server',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });
    
    socket.on('disconnect', (reason) => {
      console.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });
    
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });
  
  console.info('Socket.IO handlers set up successfully');
};