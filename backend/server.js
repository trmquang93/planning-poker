const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

// Get the frontend URL from environment variable or use localhost for development
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const io = new Server(server, {
    cors: {
        origin: [FRONTEND_URL, "https://planning-poker-demo.vercel.app"], // Add your Vercel domain here
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Add a health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

// Store active sessions using Map for better concurrency handling
const sessions = new Map();

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("joinSession", ({ sessionId, username }) => {
        try {
            console.log(`${username} (${socket.id}) joining session ${sessionId}`);

            // Create new session if it doesn't exist
            if (!sessions.has(sessionId)) {
                sessions.set(sessionId, {
                    members: new Map(),
                    votes: new Map(),
                    revealed: false,
                    scrumMaster: socket.id
                });
            }

            const session = sessions.get(sessionId);

            // Add member to session
            session.members.set(socket.id, username);
            socket.join(sessionId);

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

    socket.on("vote", ({ sessionId, vote }) => {
        try {
            if (!sessions.has(sessionId)) return;

            const session = sessions.get(sessionId);
            if (!session.revealed) {
                session.votes.set(socket.id, vote);

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

    socket.on("revealVotes", ({ sessionId }) => {
        try {
            if (!sessions.has(sessionId)) return;

            const session = sessions.get(sessionId);
            if (session.scrumMaster === socket.id) {
                session.revealed = true;
                io.to(sessionId).emit("votesRevealed", Object.fromEntries(session.votes));
            }
        } catch (error) {
            console.error("Error in revealVotes:", error);
            socket.emit("error", "Failed to reveal votes");
        }
    });

    socket.on("resetVotes", ({ sessionId }) => {
        try {
            if (!sessions.has(sessionId)) return;

            const session = sessions.get(sessionId);
            if (session.scrumMaster === socket.id) {
                session.votes.clear();
                session.revealed = false;
                io.to(sessionId).emit("votesReset");
            }
        } catch (error) {
            console.error("Error in resetVotes:", error);
            socket.emit("error", "Failed to reset votes");
        }
    });

    socket.on("disconnecting", () => {
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
                        console.log(`Session ${sessionId} deleted - no members remaining`);
                    } else {
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
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Allowing CORS for: ${FRONTEND_URL}`);
});
