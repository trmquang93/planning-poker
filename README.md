# Planning Poker App

A real-time planning poker application for agile teams to estimate story points collaboratively.

## Features

- 🔗 Create & Join Sessions via unique URLs
- 🎯 Vote using Fibonacci numbers (1, 2, 3, 5, 8, 13, 21)
- 👥 Real-time updates for all participants
- 🎲 Hidden votes until revealed by Scrum Master
- 💾 Persistent sessions with Firebase
- 📱 Responsive design for all devices

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js + Express
- **Real-time Communication**: Socket.IO
- **Database**: Firebase Realtime Database
- **Deployment**: Vercel (Frontend) / Render (Backend)

## Setup Instructions

### Prerequisites

- Node.js 14+ installed
- Firebase account and project
- Git

### Backend Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd planning-poker/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```
Edit `.env` with your Firebase credentials.

4. Start the development server:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd ../frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Deployment

### Backend (Render)

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Add environment variables from `.env`
4. Deploy

### Frontend (Vercel)

1. Push your code to GitHub
2. Import project to Vercel
3. Configure environment variables if needed
4. Deploy

## Usage

1. Open the app in your browser
2. Create a new session or join an existing one
3. Share the session URL with your team
4. Vote on story points
5. Scrum Master can reveal votes and start new rounds

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

MIT 