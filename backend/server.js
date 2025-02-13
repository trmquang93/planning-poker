const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, get, remove } = require('firebase/database');

const app = express();
app.use(cors());

// Firebase configuration
const firebaseConfig = {
    // NOTE: Replace these with your Firebase project credentials
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    projectId: process.env.FIREBASE_PROJECT_ID,
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store active sessions using Map for better concurrency handling
const sessions = new Map();

// Helper function to save session to Firebase
async function saveSessionToFirebase(sessionId, session) {
    try {
        const sessionRef = ref(database, `sessions/${sessionId}`);
        await set(sessionRef, {
            members: Object.fromEntries(session.members),
            votes: Object.fromEntries(session.votes),
            revealed: session.revealed,
            scrumMaster: session.scrumMaster,
            lastUpdated: Date.now()
        });
    } catch (error) {
        console.error('Error saving to Firebase:', error);
    }
}

// Helper function to load session from Firebase
async function loadSessionFromFirebase(sessionId) {
    try {
        const sessionRef = ref(database, `sessions/${sessionId}`);
        const snapshot = await get(sessionRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return {
                members: new Map(Object.entries(data.members)),
                votes: new Map(Object.entries(data.votes)),
                revealed: data.revealed,
                scrumMaster: data.scrumMaster
            };
        }
        return null;
    } catch (error) {
        console.error('Error loading from Firebase:', error);
        return null;
    }
}

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("joinSession", async ({ sessionId, username }) => {
        try {
            console.log(`${username} (${socket.id}) joining session ${sessionId}`);

            // Try to load existing session from Firebase
            let session = sessions.get(sessionId);
            if (!session) {
                session = await loadSessionFromFirebase(sessionId);
                if (session) {
                    sessions.set(sessionId, session);
                } else {
                    // Create new session if it doesn't exist
                    session = {
                        members: new Map(),
                        votes: new Map(),
                        revealed: false,
                        scrumMaster: socket.id
                    };
                    sessions.set(sessionId, session);
                }
            }

            // Add member to session
            session.members.set(socket.id, username);
            socket.join(sessionId);

            // Save to Firebase
            await saveSessionToFirebase(sessionId, session);

            // Prepare session update
            const sessionUpdate = {
                members: Object.fromEntries(session.members),
                votes: session.revealed ? Object.fromEntries(session.votes) : {},
                revealed: session.revealed,
                scrumMaster: session.scrumMaster
            };

            // Broadcast session update
            io.to(sessionId).emit("updateSession", sessionUpdate);
        } catch (error) {
            console.error("Error in joinSession:", error);
            socket.emit("error", "Failed to join session");
        }
    });

    socket.on("vote", async ({ sessionId, vote }) => {
        try {
            if (!sessions.has(sessionId)) return;

            const session = sessions.get(sessionId);
            if (!session.revealed) {
                session.votes.set(socket.id, vote);

                // Save to Firebase
                await saveSessionToFirebase(sessionId, session);

                // Broadcast votes update
                io.to(sessionId).emit("updateVotes", {
                    votes: Object.fromEntries(session.votes),
                    revealed: false
                });
            }
        } catch (error) {
            console.error("Error in vote:", error);
            socket.emit("error", "Failed to record vote");
        }
    });

    socket.on("revealVotes", async ({ sessionId }) => {
        try {
            if (!sessions.has(sessionId)) return;

            const session = sessions.get(sessionId);
            if (session.scrumMaster === socket.id) {
                session.revealed = true;

                // Save to Firebase
                await saveSessionToFirebase(sessionId, session);

                io.to(sessionId).emit("votesRevealed", Object.fromEntries(session.votes));
            }
        } catch (error) {
            console.error("Error in revealVotes:", error);
            socket.emit("error", "Failed to reveal votes");
        }
    });

    socket.on("resetVotes", async ({ sessionId }) => {
        try {
            if (!sessions.has(sessionId)) return;

            const session = sessions.get(sessionId);
            if (session.scrumMaster === socket.id) {
                session.votes.clear();
                session.revealed = false;

                // Save to Firebase
                await saveSessionToFirebase(sessionId, session);

                io.to(sessionId).emit("votesReset");
            }
        } catch (error) {
            console.error("Error in resetVotes:", error);
            socket.emit("error", "Failed to reset votes");
        }
    });

    socket.on("disconnecting", async () => {
        try {
            console.log(`User disconnecting: ${socket.id}`);

            // Find all sessions this socket is in
            for (const [sessionId, session] of sessions.entries()) {
                if (session.members.has(socket.id)) {
                    // Remove member
                    session.members.delete(socket.id);
                    session.votes.delete(socket.id);

                    // If Scrum Master left, assign to next person
                    if (session.scrumMaster === socket.id && session.members.size > 0) {
                        session.scrumMaster = Array.from(session.members.keys())[0];
                    }

                    // Remove session if empty
                    if (session.members.size === 0) {
                        sessions.delete(sessionId);
                        // Remove from Firebase
                        await remove(ref(database, `sessions/${sessionId}`));
                        console.log(`Session ${sessionId} deleted - no members remaining`);
                    } else {
                        // Save updated session to Firebase
                        await saveSessionToFirebase(sessionId, session);

                        // Broadcast update
                        io.to(sessionId).emit("updateSession", {
                            members: Object.fromEntries(session.members),
                            votes: session.revealed ? Object.fromEntries(session.votes) : {},
                            revealed: session.revealed,
                            scrumMaster: session.scrumMaster
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Error in disconnecting:", error);
        }
    });
});

const PORT = process.env.PORT || 5555;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
