import { io } from 'socket.io-client';

export const socket = io('http://localhost:5555', {
    autoConnect: true,
    transports: ['websocket']
}); 