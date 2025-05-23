# Technical Context - Planning Poker Application

## Technology Stack

### Frontend Stack
- **Framework**: React 18 with TypeScript for type safety and modern development
- **Build Tool**: Vite for fast development and optimized production builds
- **Styling**: Tailwind CSS for responsive design and rapid UI development
- **State Management**: Zustand for lightweight, simple state management
- **Real-time**: Socket.IO client for WebSocket communication
- **Testing**: Vitest + React Testing Library for comprehensive test coverage
- **Type Checking**: TypeScript strict mode for maximum type safety

### Backend Stack
- **Runtime**: Node.js with Express for simple, reliable server architecture
- **Real-time**: Socket.IO for WebSocket-based real-time communication
- **Data Storage**: In-memory storage with JSON file persistence for free hosting
- **Session Management**: Custom session store with automatic cleanup
- **Testing**: Jest + Supertest for API and socket testing
- **Process Management**: Built-in clustering for better performance

### Development Environment
- **Package Manager**: npm for dependency management
- **Code Quality**: ESLint + Prettier for consistent code formatting
- **Git Hooks**: Husky for pre-commit quality checks
- **Environment**: Node.js 18+ LTS for stability and performance

## Deployment Architecture

### Frontend Deployment
- **Primary**: Vercel for optimal React deployment with edge network
- **Alternative**: Netlify for backup deployment option
- **Build**: Static site generation with client-side routing
- **CDN**: Automatic global distribution for performance

### Backend Deployment
- **Primary**: Railway for free WebSocket support and easy deployment
- **Alternative**: Render for backup hosting option
- **Scaling**: Horizontal scaling based on session demand
- **Monitoring**: Built-in health checks and logging

### Alternative: Full-Stack Deployment
- **Option**: Vercel serverless functions for simpler architecture
- **Trade-offs**: WebSocket limitations but simplified deployment
- **Use Case**: Lower traffic scenarios or simplified maintenance

## Technical Constraints

### Hosting Limitations
- Free tier resource limits (CPU, memory, bandwidth)
- No persistent database (cost constraint)
- Limited concurrent connections per instance
- Automatic scaling limitations on free plans

### Performance Requirements
- Real-time updates within 1-2 seconds
- Session join/creation under 3 seconds
- Vote submission/reveal under 500ms
- Support for 10+ concurrent sessions

### Browser Support
- Modern browsers only (last 2 versions)
- WebSocket support required
- JavaScript enabled (no graceful degradation)
- Mobile responsive design mandatory

## Data Management

### Session Storage
- In-memory primary storage for real-time performance
- JSON file backup for persistence across restarts
- Automatic cleanup after 2 hours of inactivity
- No long-term data retention

### Data Security
- Session isolation through unique codes
- No sensitive data collection
- Automatic data cleanup
- No cross-session data leakage

## Development Workflow

### Code Quality
- TypeScript strict mode for type safety
- ESLint with strict rules for code quality
- Prettier for consistent formatting
- Husky for automated pre-commit checks

### Testing Strategy
- Unit tests for all business logic
- Integration tests for API endpoints
- Socket event testing for real-time functionality
- End-to-end tests for critical user journeys
- Minimum 80% code coverage requirement

### Deployment Pipeline
- Automated testing on pull requests
- Automatic deployment on main branch
- Environment-specific configurations
- Health monitoring and alerting

## Dependencies

### Core Dependencies
```json
{
  "react": "^18.x",
  "typescript": "^5.x",
  "vite": "^5.x",
  "tailwindcss": "^3.x",
  "zustand": "^4.x",
  "socket.io": "^4.x",
  "socket.io-client": "^4.x",
  "express": "^4.x"
}
```

### Development Dependencies
```json
{
  "vitest": "^1.x",
  "@testing-library/react": "^14.x",
  "jest": "^29.x",
  "supertest": "^6.x",
  "eslint": "^8.x",
  "prettier": "^3.x",
  "husky": "^8.x"
}
```

## Architecture Decisions

### Real-time Communication
- **Choice**: Socket.IO over native WebSockets
- **Rationale**: Better fallback support, easier event management, room-based organization
- **Trade-offs**: Slightly larger bundle size but more reliable connections

### State Management
- **Choice**: Zustand over Redux or Context
- **Rationale**: Minimal boilerplate, excellent TypeScript support, simple mental model
- **Trade-offs**: Less ecosystem but sufficient for application complexity

### Styling Approach
- **Choice**: Tailwind CSS over styled-components or CSS modules
- **Rationale**: Faster development, consistent design system, smaller runtime
- **Trade-offs**: Learning curve but better long-term maintainability

### Data Persistence
- **Choice**: In-memory + JSON files over database
- **Rationale**: Free hosting compatibility, simple implementation, sufficient for use case
- **Trade-offs**: Limited scalability but meets current requirements