# State Management

## Core State Interfaces

### Room State
```typescript
interface RoomState {
  id: string;
  votingSession: VotingSession | null;
  hostState: HostState;
  currentHost: User;
  votingScale: VotingScale;
  participants: User[];
  stories: Story[];
}
```

### Voting Session State
```typescript
interface VotingSession {
  id: string;
  storyId: string;
  state: VotingState;
  votes: Map<string, VoteData>;
  startTime: Date;
  revealTime?: Date;
  finalEstimate?: string;
}

interface VoteData {
  value: string;
  lastUpdated: Date;
  updates: number;
}
```

### Host State
```typescript
interface HostState {
  currentHost: User;
  previousHost?: User;
  transferHistory: HostTransfer[];
  status: 'active' | 'disconnected' | 'transferred';
}
```

## State Updates

### 1. Voting State Transitions
```typescript
enum VotingState {
  IDLE = 'idle',
  VOTING_IN_PROGRESS = 'voting_in_progress',
  VOTES_REVEALED = 'votes_revealed',
  VOTING_COMPLETED = 'voting_completed'
}

interface VotingStateTransition {
  from: VotingState;
  to: VotingState;
  trigger: VotingAction;
  conditions: VotingCondition[];
  sideEffects: VotingEffect[];
}
```

### 2. Host State Transitions
```typescript
enum HostAction {
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',
  TRANSFER = 'transfer',
  REJOIN = 'rejoin'
}

interface HostStateTransition {
  from: HostState;
  to: HostState;
  trigger: HostAction;
  conditions: HostCondition[];
  sideEffects: HostEffect[];
}
```

## State Synchronization

### 1. Initial State Load
```typescript
interface InitialState {
  room: RoomState;
  user: UserState;
  votingScale: VotingScale;
}

function initializeState(initialData: InitialState): void;
```

### 2. Real-time Updates
```typescript
interface StateUpdate {
  type: UpdateType;
  payload: any;
  timestamp: Date;
  version: number;
}

function handleStateUpdate(update: StateUpdate): void;
```

## State Persistence

### 1. Local Storage
```typescript
interface LocalStorageState {
  userId: string;
  userName: string;
  lastRoom?: string;
  votingPreferences: VotingPreferences;
}
```

### 2. Session Storage
```typescript
interface SessionState {
  currentVote?: string;
  voteHistory: VoteHistory[];
  connectionStatus: ConnectionStatus;
}
```

## Error States

### 1. Connection Errors
```typescript
interface ConnectionError {
  type: 'disconnect' | 'timeout' | 'failed';
  timestamp: Date;
  retryCount: number;
  lastSuccessfulState?: RoomState;
}
```

### 2. Validation Errors
```typescript
interface ValidationError {
  field: string;
  error: string;
  value: any;
  constraints: ValidationConstraint[];
}
```

## State Recovery

### 1. Reconnection Flow
```typescript
async function handleReconnection(): Promise<void> {
  // 1. Restore last known state
  // 2. Request state sync from server
  // 3. Resolve conflicts
  // 4. Update UI
}
```

### 2. Conflict Resolution
```typescript
interface StateConflict {
  clientState: Partial<RoomState>;
  serverState: Partial<RoomState>;
  resolution: StateResolution;
}
```

## UI State Mapping

### 1. Component State Derivation
```typescript
interface UIState {
  isVoting: boolean;
  canVote: boolean;
  canReveal: boolean;
  showResults: boolean;
  votingProgress: VotingProgress;
}
```

### 2. Action Permissions
```typescript
interface ActionPermissions {
  canStartVoting: boolean;
  canSubmitVote: boolean;
  canRevealVotes: boolean;
  canResetVoting: boolean;
  canTransferHost: boolean;
}
``` 