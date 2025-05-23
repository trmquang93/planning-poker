# System Patterns - Planning Poker Application

## Architecture Overview

### Frontend Architecture
```
┌─────────────────────────────────────┐
│           React Frontend            │
├─────────────────────────────────────┤
│  Components  │  Hooks  │  Services  │
├─────────────────────────────────────┤
│     Zustand State Management        │
├─────────────────────────────────────┤
│      Socket.IO Client Library       │
└─────────────────────────────────────┘
```

### Backend Architecture
```
┌─────────────────────────────────────┐
│         Express.js Server           │
├─────────────────────────────────────┤
│   Routes   │  Socket  │  Services   │
├─────────────────────────────────────┤
│      Session Management Layer       │
├─────────────────────────────────────┤
│    In-Memory Store + File Backup    │
└─────────────────────────────────────┘
```

## Design Patterns

### Frontend Patterns

#### Component Architecture
- **Container/Presentational**: Separate data logic from UI rendering
- **Custom Hooks**: Encapsulate stateful logic and side effects
- **Compound Components**: Complex UI components with multiple parts
- **Error Boundaries**: Graceful error handling and user feedback

#### State Management Patterns
- **Store Slices**: Separate concerns into focused state slices
- **Selectors**: Computed state derivation for complex data
- **Actions**: Centralized state mutations with type safety
- **Persistence**: Automatic state hydration and persistence

#### Communication Patterns
- **Event Emitters**: Socket.IO event handling with type safety
- **Message Queue**: Ordered processing of real-time updates
- **Reconnection Logic**: Automatic reconnection with state recovery
- **Optimistic Updates**: Immediate UI updates with server confirmation

### Backend Patterns

#### Session Management
- **Repository Pattern**: Abstract data access layer for sessions
- **Factory Pattern**: Session creation with proper initialization
- **Observer Pattern**: Event-driven updates to session participants
- **Command Pattern**: Session actions with undo/redo capability

#### Real-time Communication
- **Room-based Organization**: Socket.IO rooms for session isolation
- **Event Bus**: Central event coordination across services
- **Message Broadcasting**: Efficient updates to session participants
- **Connection Management**: Handle join/leave/reconnect scenarios

#### Data Persistence
- **Write-Through Cache**: Immediate memory updates with file backup
- **Lazy Loading**: Load session data only when needed
- **Garbage Collection**: Automatic cleanup of expired sessions
- **Conflict Resolution**: Handle concurrent session modifications

## Component Relationships

### Frontend Components
```
App
├── Router
├── ErrorBoundary
├── SocketProvider
└── Pages
    ├── HomePage
    │   ├── CreateSession
    │   └── JoinSession
    ├── SessionPage
    │   ├── SessionHeader
    │   ├── ParticipantsList
    │   ├── StoryManager
    │   ├── VotingInterface
    │   ├── ResultsDisplay
    │   └── SessionControls
    └── ResultsPage
        ├── SessionSummary
        └── ExportOptions
```

### Service Layer
```
SessionService
├── createSession()
├── joinSession()
├── addStory()
├── submitVote()
├── revealVotes()
└── exportResults()

SocketService
├── connect()
├── disconnect()
├── joinRoom()
├── leaveRoom()
└── emit/listen events

StateService
├── sessionState
├── userState
├── votingState
└── uiState
```

## Data Flow Patterns

### Session Creation Flow
1. User requests session creation
2. Frontend validates input
3. API call to backend
4. Session created in memory
5. Session code generated
6. Response sent to frontend
7. State updated
8. UI reflects new session

### Real-time Voting Flow
1. User submits vote
2. Optimistic UI update
3. Socket event to server
4. Server validates and stores vote
5. Broadcast to session participants
6. All clients update voting status
7. UI shows vote progress

### Session Persistence Flow
1. Session state changes
2. In-memory store updated
3. File backup triggered
4. Async write to disk
5. Error handling for write failures
6. Recovery mechanisms on restart

## Error Handling Patterns

### Frontend Error Handling
- **Error Boundaries**: React error boundaries for component failures
- **Try-Catch Blocks**: Async operation error handling
- **User Feedback**: Toast notifications for user-facing errors
- **Retry Logic**: Automatic retry for transient failures

### Backend Error Handling
- **Graceful Degradation**: Continue operation with reduced functionality
- **Circuit Breaker**: Prevent cascade failures
- **Logging**: Comprehensive error logging for debugging
- **Recovery**: Automatic recovery from common error scenarios

### Network Error Handling
- **Connection Loss**: Automatic reconnection with state recovery
- **Timeout Handling**: Graceful timeout with user feedback
- **Rate Limiting**: Prevent abuse while maintaining usability
- **Fallback Mechanisms**: Alternative paths when primary fails

## Security Patterns

### Session Isolation
- **Unique Session Codes**: Cryptographically secure session identifiers
- **Room-based Access**: Socket.IO rooms prevent cross-session data
- **Input Validation**: Comprehensive validation of all user inputs
- **Rate Limiting**: Prevent abuse and ensure fair resource usage

### Data Protection
- **No Sensitive Data**: Avoid collecting any personal information
- **Automatic Cleanup**: Remove session data after expiration
- **Secure Communication**: HTTPS/WSS for all communications
- **CORS Configuration**: Proper cross-origin resource sharing setup

## Performance Patterns

### Frontend Optimization
- **Code Splitting**: Lazy load non-critical components
- **Memoization**: React.memo and useMemo for expensive operations
- **Virtual Scrolling**: Handle large participant lists efficiently
- **Bundle Optimization**: Tree shaking and compression

### Backend Optimization
- **Connection Pooling**: Efficient WebSocket connection management
- **Memory Management**: Proper cleanup of session data
- **Event Batching**: Batch multiple updates for efficiency
- **Caching**: In-memory caching of frequently accessed data

### Real-time Optimization
- **Debouncing**: Prevent excessive event firing
- **Throttling**: Limit update frequency for smooth performance
- **Compression**: Compress Socket.IO messages
- **Selective Updates**: Only send necessary data changes