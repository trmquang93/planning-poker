import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NODE_ENV === 'production'
    ? 'https://planning-poker-nine-umber.vercel.app'
    : 'http://localhost:5555';

// Create socket instance with auto-reconnect and proper auth
export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: {
        userId: localStorage.getItem('userId')
    }
});

// Add connection event handlers
socket.on('connect', () => {
    console.log('Socket connected:', socket.id);
});

socket.on('disconnect', () => {
    console.log('Socket disconnected');
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
});

// Export socket instance
export default socket;