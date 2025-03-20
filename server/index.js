const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

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

// File path for storing rooms data
const ROOMS_FILE = path.join(__dirname, 'rooms.json');

// Load rooms from file or initialize empty Map
const loadRooms = () => {
    try {
        if (fs.existsSync(ROOMS_FILE)) {
            const data = fs.readFileSync(ROOMS_FILE, 'utf8');
            const roomsData = JSON.parse(data);
            // Convert the plain object back to a Map
            const rooms = new Map();
            Object.entries(roomsData).forEach(([key, value]) => {
                // Convert votes back to Map
                value.votes = new Map(Object.entries(value.votes || {}));
                rooms.set(key, value);
            });
            return rooms;
        }
    } catch (error) {
        console.error('Error loading rooms:', error);
    }
    return new Map();
};

// Save rooms to file
const saveRooms = (rooms) => {
    try {
        // Convert Map to plain object for JSON serialization
        const roomsData = {};
        rooms.forEach((value, key) => {
            // Convert votes Map to plain object
            const roomData = { ...value };
            roomData.votes = Object.fromEntries(value.votes);
            roomsData[key] = roomData;
        });
        fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsData, null, 2));
    } catch (error) {
        console.error('Error saving rooms:', error);
    }
};

// Store rooms in memory (in production, use a database)
const rooms = loadRooms();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    const userId = socket.handshake.auth.userId;

    // Store userId in socket for easy access
    socket.userId = userId;

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
                host: userId,
                hostSocketId: socket.id,
                users: [{ id: socket.id, userId: userId, name: 'Host' }],
                stories: [],
                currentStory: null,
                votes: new Map(),
                createdAt: new Date().toISOString()
            });

            // Save rooms after creating a new one
            saveRooms(rooms);

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

        // Check if user is already in the room with a different socket
        const existingUserIndex = room.users.findIndex(u => u.userId === userId);
        if (existingUserIndex !== -1) {
            // Update the socket ID for the existing user
            room.users[existingUserIndex].id = socket.id;
            if (room.host === userId) {
                room.hostSocketId = socket.id;
            }
        } else {
            // Add new user to the room
            room.users.push({ id: socket.id, userId: userId, name: userName });
        }

        socket.join(roomId);
        rooms.set(roomId, room);

        // Save rooms after user joins
        saveRooms(rooms);

        io.to(roomId).emit('userJoined', {
            users: room.users,
            host: room.host
        });

        callback({
            success: true,
            room: {
                ...room,
                isHost: room.host === userId
            }
        });
    });

    // Add a new story
    socket.on('addStory', ({ roomId, story }, callback) => {
        try {
            const room = rooms.get(roomId);
            if (!room) {
                if (callback) callback({ success: false, message: 'Room not found' });
                return;
            }

            if (room.host !== userId) {
                if (callback) callback({ success: false, message: 'Only host can add stories' });
                return;
            }

            // Validate story data
            if (!story || !story.title || typeof story.title !== 'string') {
                if (callback) callback({ success: false, message: 'Invalid story data' });
                return;
            }

            const newStory = {
                ...story,
                id: uuidv4(),
                status: 'pending',
                createdAt: new Date().toISOString()
            };

            // Add the story and save immediately
            room.stories.push(newStory);
            rooms.set(roomId, room);
            saveRooms(rooms);

            // Send success response to the caller first
            if (callback) callback({ success: true, story: newStory });

            // Broadcast to all sockets in the room EXCEPT the sender
            socket.to(roomId).emit('storiesUpdated', {
                stories: room.stories,
                lastUpdated: new Date().toISOString()
            });

            // Also emit to the sender to ensure they get the update
            socket.emit('storiesUpdated', {
                stories: room.stories,
                lastUpdated: new Date().toISOString()
            });

            // Log the broadcast
            console.log(`Broadcasting storiesUpdated to room ${roomId} with ${room.stories.length} stories`);

        } catch (error) {
            console.error('Error in addStory handler:', error);
            if (callback) callback({ success: false, message: error.message });
        }
    });

    // Start voting on a story
    socket.on('startVoting', ({ roomId, storyId }) => {
        const room = rooms.get(roomId);
        if (room && room.host === userId) {
            room.currentStory = storyId;
            room.votes = new Map();
            rooms.set(roomId, room);
            saveRooms(rooms);
            io.to(roomId).emit('votingStarted', { storyId });
        }
    });

    // Submit vote
    socket.on('submitVote', ({ roomId, vote }) => {
        const room = rooms.get(roomId);
        if (room) {
            room.votes.set(userId, vote);
            rooms.set(roomId, room);
            saveRooms(rooms);
            io.to(roomId).emit('voteSubmitted', {
                totalVotes: room.votes.size,
                userCount: room.users.length
            });
        }
    });

    // Reveal votes
    socket.on('revealVotes', ({ roomId }) => {
        const room = rooms.get(roomId);
        if (room && room.host === userId) {
            const votes = Array.from(room.votes.entries()).map(([voterId, vote]) => ({
                user: room.users.find(u => u.userId === voterId),
                vote
            }));
            io.to(roomId).emit('votesRevealed', { votes });
        }
    });

    // Complete story voting
    socket.on('completeVoting', ({ roomId, finalEstimate }) => {
        const room = rooms.get(roomId);
        if (room && room.host === userId) {
            const storyIndex = room.stories.findIndex(s => s.id === room.currentStory);
            if (storyIndex !== -1) {
                room.stories[storyIndex].status = 'completed';
                room.stories[storyIndex].finalEstimate = finalEstimate;
                room.currentStory = null;
                room.votes = new Map();
                rooms.set(roomId, room);
                saveRooms(rooms);
                io.to(roomId).emit('votingCompleted', { stories: room.stories });
            }
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        rooms.forEach((room, roomId) => {
            const userIndex = room.users.findIndex(u => u.id === socket.id);
            if (userIndex !== -1) {
                // Only remove user if they don't have other active connections
                const hasOtherConnections = Array.from(io.sockets.sockets.values())
                    .some(s => s.id !== socket.id && s.userId === userId);

                if (!hasOtherConnections) {
                    room.users.splice(userIndex, 1);
                    if (room.users.length === 0) {
                        rooms.delete(roomId);
                    } else if (room.host === userId) {
                        // Transfer host to the first remaining user
                        room.host = room.users[0].userId;
                        room.hostSocketId = room.users[0].id;
                        io.to(roomId).emit('userLeft', {
                            users: room.users,
                            host: room.host
                        });
                    }
                    saveRooms(rooms);
                }
            }
        });
    });
});

// Clean up old rooms periodically (24 hours)
setInterval(() => {
    const now = new Date();
    rooms.forEach((room, roomId) => {
        const roomDate = new Date(room.createdAt);
        if ((now - roomDate) > 24 * 60 * 60 * 1000) {
            rooms.delete(roomId);
        }
    });
    saveRooms(rooms);
}, 60 * 60 * 1000); // Check every hour

const PORT = process.env.PORT || 5555;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});