# Planning Poker Application

A state-of-the-art, real-time Planning Poker web application for remote agile teams.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ LTS
- npm 9+

### Installation
```bash
# Install all dependencies
npm run install:all

# Build shared types
cd shared && npm run build && cd ..
```

### Development
```bash
# Start both frontend and backend in development mode
npm run dev

# Or start individually:
npm run dev:frontend  # Frontend at http://localhost:3000
npm run dev:backend   # Backend at http://localhost:3001
```

### Build
```bash
# Build entire project
npm run build

# Build individual packages
npm run build:frontend
npm run build:backend
```

### Testing
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check
```

## 🏗️ Project Structure

```
planning-poker/
├── frontend/          # React + TypeScript + Vite + Tailwind CSS
├── backend/           # Node.js + Express + Socket.IO + TypeScript
├── shared/            # Shared types and utilities
├── .memory-bank/      # Project documentation and context
└── .claude/           # Development framework configuration
```

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for responsive styling
- **Zustand** for state management
- **Socket.IO Client** for real-time communication
- **React Router** for navigation

### Backend
- **Node.js** with Express
- **Socket.IO** for WebSocket communication
- **TypeScript** for type safety
- **Zod** for runtime validation
- **In-memory storage** with JSON persistence

### Development Tools
- **ESLint** + **Prettier** for code quality
- **Vitest** (frontend) + **Jest** (backend) for testing
- **Husky** for git hooks
- **Workspaces** for monorepo management

## 🎯 Features

- **Real-time Estimation** - Simultaneous voting with private estimates
- **Session Management** - Create and join sessions with codes/links
- **Multi-facilitator Support** - Multiple session managers
- **Story Management** - Add and track estimation progress
- **Mobile Responsive** - Works on all devices
- **Export Results** - CSV and text format exports
- **No Registration** - Instant access without accounts

## 🚦 API Endpoints

### REST API
- `GET /health` - Server health check
- `GET /api/sessions/health` - Session API health
- `POST /api/sessions/create` - Create new session
- `POST /api/sessions/join` - Join existing session

### WebSocket Events
- Real-time participant updates
- Live voting status
- Session state synchronization
- Story management events

## 📱 Usage

1. **Create Session**: Visit homepage and click "Create Session"
2. **Share Code**: Share the 6-character session code with team members
3. **Join Session**: Team members enter code and their name
4. **Add Stories**: Facilitators add stories to estimate
5. **Vote**: Team members privately select estimates
6. **Reveal**: Facilitator reveals all votes simultaneously
7. **Consensus**: Team discusses and sets final estimate
8. **Export**: Download session results in CSV or text format

## 🔧 Configuration Status

✅ **Project Foundation** - Monorepo with workspaces  
✅ **TypeScript Configuration** - Strict mode with path mapping  
✅ **Build System** - Vite (frontend) + TSC (backend)  
✅ **Development Environment** - Hot reload and proxy setup  
✅ **Code Quality** - ESLint + Prettier with consistent rules  
✅ **Styling System** - Tailwind CSS with custom design tokens  
✅ **Shared Types** - Zod schemas for runtime validation  
✅ **Basic UI Structure** - Responsive React components  
✅ **Server Setup** - Express + Socket.IO with middleware  

## 🧪 Next Steps

- [ ] Set up comprehensive testing suite
- [ ] Implement core session management API
- [ ] Build real-time WebSocket communication
- [ ] Add participant tracking system
- [ ] Create voting and revelation mechanisms
- [ ] Implement story management
- [ ] Add export functionality
- [ ] Performance optimization
- [ ] Production deployment setup

## 🏁 Development Status

**Phase**: Foundation Complete ✅  
**Progress**: 25% (Infrastructure ready for core feature development)  
**Next**: Implement core session management with TDD methodology