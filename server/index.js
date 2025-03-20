const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Test endpoint
app.get('/test', (req, res) => {
    res.status(200).json({ message: 'Server is running properly' });
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? ['https://planning-poker-nine-umber.vercel.app'] : ['http://localhost:3000'],
        methods: ['GET', 'POST']
    }
});

// Store rooms in memory (in production, use a database)
const rooms = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Create a new room
    socket.on('createRoom', (data, callback) => {
        console.log('Received createRoom event from client:', socket.id);

        try {
            // Check if callback is actually the first parameter (for backward compatibility)
            if (typeof data === 'function' && !callback) {
                callback = data;
                data = {};
            }

            // Ensure callback is a function
            if (typeof callback !== 'function') {
                console.error('Callback is not a function:', typeof callback);
                return;
            }

            // Leave previously joined rooms (except the socket's default room)
            socket.rooms.forEach((room) => {
                if (room !== socket.id) {
                    socket.leave(room);
                }
            });

            const roomId = uuidv4();
            console.log('Created new room with ID:', roomId);

            rooms.set(roomId, {
                id: roomId,
                host: socket.id,
                users: [{ id: socket.id, name: 'Host' }],
                stories: [],
                currentStory: null,
                votes: new Map()
            });

            socket.join(roomId);
            console.log('Socket joined room:', roomId);

            const response = { roomId, success: true };
            console.log('Sending response to client:', response);
            callback(response);
        } catch (error) {
            console.error('Error in createRoom handler:', error);
            if (typeof callback === 'function') {
                callback({ success: false, error: error.message });
            }
        }
    });

    // Join a room
    socket.on('joinRoom', ({ roomId, userName }, callback) => {
        const room = rooms.get(roomId);
        if (!room) {
            callback({ success: false, message: 'Room not found' });
            return;
        }

        socket.join(roomId);
        room.users.push({ id: socket.id, name: userName });
        rooms.set(roomId, room);

        io.to(roomId).emit('userJoined', { users: room.users });
        callback({ success: true, room });
    });

    // Add a new story
    socket.on('addStory', ({ roomId, story }) => {
        const room = rooms.get(roomId);
        if (room && room.host === socket.id) {
            room.stories.push({...story, id: uuidv4(), status: 'pending' });
            io.to(roomId).emit('storiesUpdated', { stories: room.stories });
        }
    });

    // Start voting on a story
    socket.on('startVoting', ({ roomId, storyId }) => {
        const room = rooms.get(roomId);
        if (room && room.host === socket.id) {
            room.currentStory = storyId;
            room.votes = new Map();
            io.to(roomId).emit('votingStarted', { storyId });
        }
    });

    // Submit vote
    socket.on('submitVote', ({ roomId, vote }) => {
        const room = rooms.get(roomId);
        if (room && room.currentStory) {
            room.votes.set(socket.id, vote);
            io.to(roomId).emit('voteSubmitted', {
                totalVotes: room.votes.size,
                userCount: room.users.length
            });
        }
    });

    // Reveal votes
    socket.on('revealVotes', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room && room.host === socket.id) {
            const votes = Array.from(room.votes.entries()).map(([userId, vote]) => ({
                user: room.users.find(u => u.id === userId),
                vote
            }));
            io.to(roomId).emit('votesRevealed', { votes });
        }
    });

    // Complete story voting
    socket.on('completeVoting', ({ roomId, finalEstimate }) => {
        const room = rooms.get(roomId);
        if (room && room.host === socket.id) {
            const storyIndex = room.stories.findIndex(s => s.id === room.currentStory);
            if (storyIndex !== -1) {
                room.stories[storyIndex].status = 'completed';
                room.stories[storyIndex].finalEstimate = finalEstimate;
                room.currentStory = null;
                room.votes = new Map();
                io.to(roomId).emit('votingCompleted', { stories: room.stories });
            }
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        rooms.forEach((room, roomId) => {
            const userIndex = room.users.findIndex(u => u.id === socket.id);
            if (userIndex !== -1) {
                room.users.splice(userIndex, 1);
                if (room.users.length === 0) {
                    rooms.delete(roomId);
                } else {
                    if (room.host === socket.id) {
                        room.host = room.users[0].id;
                    }
                    io.to(roomId).emit('userLeft', { users: room.users });
                }
            }
        });
    });
});

const PORT = process.env.PORT || 5555;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});