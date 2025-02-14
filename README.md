# Planning Poker App

A real-time planning poker application for agile teams to estimate user stories collaboratively.

## Features

- Create and join planning poker rooms
- Add and manage user stories
- Real-time voting with hidden votes
- Reveal votes simultaneously
- Calculate suggested estimates based on team votes
- Fibonacci sequence for story points
- Room host controls for managing the session

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository
2. Install server dependencies:
   ```bash
   npm install
   ```
3. Install client dependencies:
   ```bash
   cd client
   npm install
   ```

## Running the Application

1. Start the backend server:
   ```bash
   npm run dev
   ```

2. In a new terminal, start the frontend:
   ```bash
   cd client
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Create a new room or join an existing one using a room code
2. Room host can add user stories and start voting sessions
3. Team members can vote on stories using the Fibonacci sequence
4. Room host can reveal votes and complete the voting process
5. Final estimates are saved and displayed for each story

## Technologies Used

- Frontend:
  - React
  - Chakra UI
  - Socket.IO Client
  - React Router

- Backend:
  - Node.js
  - Express
  - Socket.IO
  - UUID 