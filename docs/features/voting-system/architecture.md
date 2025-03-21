 # Voting System Architecture

## System Overview
The voting system is built on a real-time event-driven architecture using Socket.IO for communication and React for the UI layer.

## Core Components

### 1. VotingManager
Primary controller for voting operations and state management.

```typescript
class VotingManager {
  private currentSession: VotingSession | null;
  private votingScale: VotingScale;
  private eventEmitter: EventEmitter;

  // Core voting operations
  public startVoting(storyId: string): Promise<void>;
  public submitVote(userId: string, vote: string): Promise<void>;
  public updateVote(userId: string, newVote: string): Promise<void>;
  public revealVotes(): Promise<void>;
  public resetVoting(): Promise<void>;
  public completeVoting(finalEstimate: string): Promise<void>;

  // State management
  public getVotingState(): VotingState;
  public getCurrentVotes(): Map<string, Vote>;
  public getVotingStatistics(): VotingStatistics;
}
```

### 2. HostManager
Handles host role assignment and management.

```typescript
class HostManager {
  private currentHost: User;
  private hostHistory: HostTransfer[];

  // Host management operations
  public transferHost(newHostId: string): Promise<void>;
  public handleHostDisconnection(): Promise<void>;
  public handleHostRejoin(userId: string): Promise<void>;
  public getCurrentHost(): User;
  public isUserHost(userId: string): boolean;
}
```

### 3. VotingSession
Represents an active voting session.

```typescript
interface VotingSession {
  id: string;
  storyId: string;
  state: VotingState;
  votes: Map<string, {
    value: string;
    lastUpdated: Date;
    updates: number;
  }>;
  startTime: Date;
  revealTime?: Date;
}
```

## State Machine
```
┌──────────┐
│   IDLE   │
└────┬─────┘
     │ startVoting()
     ▼
┌──────────────────┐
│ VOTING_IN_PROGRESS│
└────────┬─────────┘
         │ revealVotes()
         ▼
┌──────────────┐
│ VOTES_REVEALED│
└──────┬───────┘
       │
       ├─── resetVoting() ──┐
       │                    │
       │                    ▼
       │         ┌──────────────────┐
       │         │ VOTING_IN_PROGRESS│
       │         └──────────────────┘
       │
       └─── completeVoting()
             │
             ▼
    ┌──────────────┐
    │    IDLE      │
    └──────────────┘
```

## Data Flow

1. **Voting Initiation**
   ```
   Host → startVoting() → Socket Event → All Clients → UI Update
   ```

2. **Vote Submission**
   ```
   User → submitVote() → Socket Event → All Clients → Progress Update
   ```

3. **Vote Reveal**
   ```
   Host → revealVotes() → Socket Event → All Clients → Display Results
   ```

4. **Host Transfer**
   ```
   Current Host → transferHost() → Socket Event → All Clients → Update Permissions
   ```

## Error Handling

1. **Connection Issues**
   - Automatic reconnection attempts
   - State synchronization on reconnect
   - Temporary state caching

2. **Race Conditions**
   - Event sequence validation
   - Timestamp-based conflict resolution
   - State version tracking

3. **Invalid Operations**
   - State-based operation validation
   - User permission verification
   - Input data validation

## Performance Considerations

1. **Real-time Updates**
   - Debounced vote updates
   - Batched UI updates
   - Optimistic UI updates

2. **State Management**
   - Efficient state diffing
   - Minimal payload size
   - Cached computations

## Security

1. **Access Control**
   - Role-based operation validation
   - Session authentication
   - Action audit logging

2. **Data Integrity**
   - Vote validation
   - State transition validation
   - Host transfer validation