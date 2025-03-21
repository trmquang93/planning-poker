# Socket Events Specification

## Overview
This document details all Socket.IO events used in the Planning Poker voting system, including their payloads, validation rules, and expected behaviors.

## Connection Events

### 1. Room Connection
```typescript
// Client -> Server
interface JoinRoomEvent {
  roomId: string;
  userName: string;
  userId: string;
}

// Server -> Client
interface RoomJoinedEvent {
  success: boolean;
  room: {
    id: string;
    users: User[];
    stories: Story[];
    currentStory?: string;
    votingScale: VotingScale;
    isHost: boolean;
    host: User;
  };
}
```

### 2. Disconnection
```typescript
// Server -> Client
interface UserLeftEvent {
  userId: string;
  timestamp: Date;
  newHost?: User;
}
```

## Host Management Events

### 1. Host Transfer
```typescript
// Client -> Server
interface TransferHostEvent {
  roomId: string;
  newHostId: string;
}

// Server -> Client
interface HostTransferredEvent {
  oldHostId: string;
  newHostId: string;
  timestamp: Date;
}
```

### 2. Host Disconnection
```typescript
// Server -> Client
interface HostDisconnectedEvent {
  oldHostId: string;
  newHostId: string;
  reason: 'disconnection' | 'manual';
}
```

### 3. Host Rejoin
```typescript
// Server -> Client
interface HostRejoinedEvent {
  userId: string;
  isNewHost: boolean;
  timestamp: Date;
}
```

## Voting Events

### 1. Start Voting
```typescript
// Client -> Server (Host only)
interface StartVotingEvent {
  roomId: string;
  storyId: string;
}

// Server -> Client (All room members)
interface VotingStartedEvent {
  storyId: string;
  startTime: Date;
  votingScale: VotingScale;
  participants: User[];
}
```

### 2. Submit Vote
```typescript
// Client -> Server
interface SubmitVoteEvent {
  roomId: string;
  vote: string;
}

// Server -> Client (All room members)
interface VoteSubmittedEvent {
  totalVotes: number;
  userCount: number;
  lastVoteTime: Date;
}
```

### 3. Update Vote
```typescript
// Client -> Server
interface UpdateVoteEvent {
  roomId: string;
  newVote: string;
}

// Server -> Client (All room members)
interface VoteUpdatedEvent {
  userId: string;
  totalVotes: number;
  lastUpdateTime: Date;
}
```

### 4. Reveal Votes
```typescript
// Client -> Server (Host only)
interface RevealVotesEvent {
  roomId: string;
}

// Server -> Client (All room members)
interface VotesRevealedEvent {
  votes: {
    user: User;
    vote: string;
    updates: number;
  }[];
  statistics: VotingStatistics;
}
```

### 5. Reset Voting
```typescript
// Client -> Server (Host only)
interface ResetVotingEvent {
  roomId: string;
}

// Server -> Client (All room members)
interface VotingResetEvent {
  storyId: string;
  timestamp: Date;
}
```

### 6. Complete Voting
```typescript
// Client -> Server (Host only)
interface CompleteVotingEvent {
  roomId: string;
  finalEstimate: string;
}

// Server -> Client (All room members)
interface VotingCompletedEvent {
  storyId: string;
  finalEstimate: string;
  statistics: VotingStatistics;
}
```

## Story Management Events

### 1. Add Story
```typescript
// Client -> Server (Host only)
interface AddStoryEvent {
  roomId: string;
  story: {
    title: string;
  };
}

// Server -> Client (All room members)
interface StoriesUpdatedEvent {
  stories: Story[];
}
```

## Error Events

### 1. Voting Errors
```typescript
// Server -> Client
interface VotingErrorEvent {
  type: 'invalid_vote' | 'unauthorized' | 'state_error';
  message: string;
  details: any;
}
```

### 2. Host Errors
```typescript
// Server -> Client
interface HostErrorEvent {
  type: 'transfer_failed' | 'unauthorized' | 'invalid_operation';
  message: string;
  details: any;
}
```

## Event Validation Rules

### 1. Host Actions
- Only current host can start voting
- Only current host can reveal votes
- Only current host can reset voting
- Only current host can complete voting
- Only current host can transfer host role

### 2. Voting Actions
- Users can only vote during active voting session
- Users can update their vote before reveal
- Votes must be from the current voting scale
- Cannot vote after votes are revealed

### 3. Room State Validation
- Room must exist for all operations
- User must be in room for all operations
- Story must exist for voting operations
- Cannot start new voting while one is in progress

## Error Handling

### 1. Connection Errors
- Automatic reconnection attempts
- State synchronization after reconnect
- Host role reassignment on disconnect

### 2. Operation Errors
- Invalid state transitions
- Unauthorized operations
- Concurrent operation conflicts

## Security Considerations

### 1. Input Validation
- Sanitize all user inputs
- Validate vote values against scale
- Verify room and user existence

### 2. Authorization
- Verify host status for privileged operations
- Validate user membership in room
- Prevent unauthorized state modifications

### 3. Rate Limiting
- Limit vote updates per user
- Prevent rapid host transfers
- Control story addition rate