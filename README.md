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

### Quick Start

1. Clone the repository:
```bash
git clone <repository-url>
cd planning-poker
```

2. Install all dependencies:
```bash
npm run install-all
```

3. Configure environment variables:
```bash
cp backend/.env.example backend/.env
```
Edit `backend/.env` with your Firebase credentials.

4. Start development servers:
```bash
npm run dev
```
This will start both frontend and backend servers in development mode with:
- Frontend at http://localhost:3000
- Backend at http://localhost:5555

### Manual Setup

If you prefer to run the servers separately:

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
```
Edit `.env` with your Firebase credentials.

4. Start the development server:
```bash
npm run dev
```

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

## Development

The project includes several npm scripts to help with development:

- `npm run dev`: Start both frontend and backend in development mode
- `npm run frontend`: Start only the frontend
- `npm run backend`: Start only the backend
- `npm run install-all`: Install dependencies for all packages

The development server provides:
- Color-coded console output for each service
- Automatic error highlighting
- Environment file checking
- Graceful shutdown of both servers

## Deployment

### Backend Deployment (Render)

1. Create a Render account at https://render.com

2. Create a new Web Service:
   - Fork this repository to your GitHub account
   - In Render dashboard, click "New +" and select "Web Service"
   - Connect your GitHub repository
   - Select the repository and the `main` branch

3. Configure the service:
   - Name: `planning-poker-backend` (or your preferred name)
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Select the free plan

4. Add environment variables:
   - `PORT`: 5555
   - `FRONTEND_URL`: Your Vercel frontend URL (after deploying frontend)

5. Click "Create Web Service"

Your backend will be available at: `https://your-service-name.onrender.com`

### Frontend Deployment (Vercel)

1. Create a Vercel account at https://vercel.com

2. Deploy the frontend:
   - Fork this repository to your GitHub account
   - In Vercel dashboard, click "New Project"
   - Import your GitHub repository
   - Select the repository and configure as follows:
     - Framework Preset: Create React App
     - Build Command: `npm run build`
     - Output Directory: `build`

3. Add environment variables:
   - `REACT_APP_BACKEND_URL`: Your Render backend URL

4. Click "Deploy"

Your frontend will be available at: `https://your-project-name.vercel.app`

### Updating CORS Configuration

After both services are deployed:

1. Update `backend/server.js`:
   - Add your Vercel domain to the CORS origins
   - Redeploy the backend

2. Update `frontend/vercel.json`:
   - Set the correct backend URL
   - Redeploy the frontend

### Verifying the Deployment

1. Open your Vercel frontend URL
2. Create a new session
3. Share the URL with team members
4. Verify that real-time updates work correctly

### Troubleshooting

If you encounter issues:

1. Check the deployment logs in both Render and Vercel dashboards
2. Verify environment variables are set correctly
3. Ensure CORS origins match your domains
4. Check WebSocket connections in browser DevTools

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