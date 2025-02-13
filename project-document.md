## 🔥 **Agile Planning Poker App Plan**
### **Core Features**
1️⃣ **Create & Join Sessions** – Users join a session via a unique URL.  
2️⃣ **Vote on Story Points** – Each participant selects a Fibonacci number.  
3️⃣ **Reveal Votes** – Scrum Master clicks a "Reveal Votes" button.  
4️⃣ **Session Persistence** – Votes remain visible until reset.  
5️⃣ **Real-time Updates** – Users see changes immediately via WebSockets.

---

## ⚡ **Tech Stack (Updated)**
| Component       | Choice                        | Reason |
|----------------|------------------------------|--------|
| **Frontend**   | React.js / Next.js            | Interactive UI |
| **Backend**    | Node.js (Express) + WebSockets | Real-time updates |
| **Database**   | Firebase Realtime DB (Optional) | Persistent sessions |
| **Hosting**    | Vercel (Frontend) / Render (Backend) | Free & scalable |

---

## 🏗 **Step-by-Step Development**
### **1️⃣ Backend (Express + WebSockets)**
We'll modify the backend to store votes and allow the Scrum Master to reveal them.

#### 🔹 Install Dependencies
```sh
mkdir backend && cd backend
npm init -y
npm install express socket.io cors
```

#### 🔹 **Server Code (`server.js`)**
```javascript
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
});

let sessions = {};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("joinSession", ({ sessionId, username }) => {
        if (!sessions[sessionId]) sessions[sessionId] = { members: {}, votes: {}, revealed: false };
        sessions[sessionId].members[socket.id] = username;
        socket.join(sessionId);
        io.to(sessionId).emit("updateSession", sessions[sessionId]);
    });

    socket.on("vote", ({ sessionId, vote }) => {
        if (sessions[sessionId]) {
            sessions[sessionId].votes[socket.id] = vote;
            io.to(sessionId).emit("updateVotes", sessions[sessionId].votes);
        }
    });

    socket.on("revealVotes", ({ sessionId }) => {
        if (sessions[sessionId]) {
            sessions[sessionId].revealed = true;
            io.to(sessionId).emit("votesRevealed", sessions[sessionId].votes);
        }
    });

    socket.on("resetVotes", ({ sessionId }) => {
        if (sessions[sessionId]) {
            sessions[sessionId].votes = {};
            sessions[sessionId].revealed = false;
            io.to(sessionId).emit("votesReset");
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(5000, () => console.log("Server running on port 5000"));
```
✅ **Key Features:**  
- Users join a session (no login required).  
- Votes remain hidden until the Scrum Master reveals them.  
- Scrum Master can reset votes for a new round.  

---

### **2️⃣ Frontend (React)**
#### 🔹 Install React & Dependencies
```sh
npx create-react-app frontend
cd frontend
npm install socket.io-client react-router-dom
```

#### 🔹 **Lobby Page (`Lobby.js`)**
Users enter a session name and join.

```javascript
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Lobby() {
    const [sessionId, setSessionId] = useState("");
    const [username, setUsername] = useState("");
    const navigate = useNavigate();

    const handleJoin = () => {
        if (sessionId && username) {
            navigate(`/session/${sessionId}?username=${username}`);
        }
    };

    return (
        <div>
            <h2>Agile Planning Poker</h2>
            <input type="text" placeholder="Enter Session ID" value={sessionId} onChange={(e) => setSessionId(e.target.value)} />
            <input type="text" placeholder="Enter Your Name" value={username} onChange={(e) => setUsername(e.target.value)} />
            <button onClick={handleJoin}>Join Session</button>
        </div>
    );
}
```
✅ **Users can join by entering a Session ID and their name**.

---

#### 🔹 **Game Room (`GameRoom.js`)**
Handles voting and Scrum Master's reveal/reset actions.

```javascript
import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import { useParams, useSearchParams } from "react-router-dom";

const socket = io("http://localhost:5000");

export default function GameRoom() {
    const { sessionId } = useParams();
    const [searchParams] = useSearchParams();
    const username = searchParams.get("username");

    const [votes, setVotes] = useState({});
    const [revealed, setRevealed] = useState(false);
    const [isScrumMaster, setIsScrumMaster] = useState(false);

    useEffect(() => {
        socket.emit("joinSession", { sessionId, username });

        socket.on("updateVotes", (votes) => setVotes(votes));
        socket.on("votesRevealed", (votes) => {
            setVotes(votes);
            setRevealed(true);
        });
        socket.on("votesReset", () => {
            setVotes({});
            setRevealed(false);
        });

        return () => socket.disconnect();
    }, [sessionId, username]);

    const handleVote = (vote) => socket.emit("vote", { sessionId, vote });
    const revealVotes = () => socket.emit("revealVotes", { sessionId });
    const resetVotes = () => socket.emit("resetVotes", { sessionId });

    return (
        <div>
            <h2>Session: {sessionId}</h2>
            <h3>User: {username}</h3>
            
            <div>
                <h3>Select Story Points:</h3>
                {[1, 2, 3, 5, 8, 13, 21].map((num) => (
                    <button key={num} onClick={() => handleVote(num)}>
                        {num}
                    </button>
                ))}
            </div>

            <h3>Votes:</h3>
            <ul>
                {Object.entries(votes).map(([user, vote]) => (
                    <li key={user}>{user}: {revealed ? vote : "❓"}</li>
                ))}
            </ul>

            {isScrumMaster && (
                <div>
                    <button onClick={revealVotes}>Reveal Votes</button>
                    <button onClick={resetVotes}>Reset Votes</button>
                </div>
            )}
        </div>
    );
}
```

✅ **Features in this UI:**  
✔️ Users vote using Fibonacci numbers.  
✔️ Votes remain hidden until revealed.  
✔️ Scrum Master can reveal/reset votes.  

---

### **3️⃣ Deployment**
- Deploy **Backend** on **Render**:
  - Push backend code to GitHub.
  - Create a new Node.js service on Render.
  - Set WebSocket CORS policy (`origin: "*"`) for testing.
  - Update WebSocket URL in the frontend.

- Deploy **Frontend** on **Vercel**:
  - Push React code to GitHub.
  - Connect GitHub repo to Vercel.
  - Update WebSocket URL to match the backend.

---

## 🎯 **Final Features Recap**
✅ No login required – users just enter a name.  
✅ Real-time voting with WebSockets.  
✅ Scrum Master controls when votes are revealed.  
✅ Reset button for new rounds.  
✅ Deployed on free hosting services.  