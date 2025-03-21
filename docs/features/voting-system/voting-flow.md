# Voting Flow

## Overview
The voting flow manages the lifecycle of a story estimation session, from initiation through completion, handling all participant interactions and state transitions.

## Voting Session Lifecycle

### 1. Session Initiation
```typescript
interface VotingInitiation {
  storyId: string;
  startTime: Date;
  initiator: User;
  votingScale: VotingScale;
  participants: User[];
}
```

### 2. Active Voting
```typescript
interface ActiveVoting {
  sessionId: string;
  currentVotes: Map<string, VoteData>;
  votingProgress: VotingProgress;
  remainingParticipants: User[];
}
```

### 3. Vote Reveal
```typescript
interface VoteReveal {
  votes: VoteData[];
  statistics: VotingStatistics;
  consensusScore?: string;
  outliers: VoteData[];
}
```

### 4. Session Completion
```typescript
interface SessionCompletion {
  finalEstimate: string;
  participantCount: number;
  voteDistribution: Map<string, number>;
  duration: number;
}
```

## Vote Management

### 1. Vote Submission
```typescript
interface VoteSubmission {
  userId: string;
  vote: string;
  timestamp: Date;
  isUpdate: boolean;
  previousVote?: string;
}
```

### 2. Vote Updates
```typescript
interface VoteUpdate {
  userId: string;
  oldVote: string;
  newVote: string;
  updateCount: number;
  lastUpdateTime: Date;
}
```

### 3. Vote Validation
```typescript
interface VoteValidation {
  isValid: boolean;
  errors: ValidationError[];
  constraints: VoteConstraints;
}
```

## State Transitions

### 1. Voting States
```typescript
enum VotingState {
  IDLE = 'idle',
  VOTING_IN_PROGRESS = 'voting_in_progress',
  VOTES_REVEALED = 'votes_revealed',
  VOTING_COMPLETED = 'voting_completed'
}
```

### 2. State Transitions
```typescript
interface StateTransition {
  from: VotingState;
  to: VotingState;
  trigger: VotingAction;
  conditions: TransitionCondition[];
  sideEffects: TransitionEffect[];
}
```

## UI Components

### 1. Voting Card
```typescript
interface VotingCard {
  value: string;
  isSelected: boolean;
  isDisabled: boolean;
  onClick: () => void;
  showAnimation: boolean;
}
```

### 2. Voting Progress
```typescript
interface VotingProgress {
  totalParticipants: number;
  votesSubmitted: number;
  remainingVoters: User[];
  showProgress: boolean;
}
```

### 3. Results Display
```typescript
interface ResultsDisplay {
  votes: VoteData[];
  statistics: VotingStatistics;
  showDistribution: boolean;
  highlightConsensus: boolean;
}
```

## Socket Events

### 1. Voting Events
```typescript
interface VotingEvents {
  'voting:start': (data: VotingInitiation) => void;
  'voting:vote': (data: VoteSubmission) => void;
  'voting:update': (data: VoteUpdate) => void;
  'voting:reveal': (data: VoteReveal) => void;
  'voting:reset': () => void;
  'voting:complete': (data: SessionCompletion) => void;
}
```

### 2. Progress Events
```typescript
interface ProgressEvents {
  'progress:vote_submitted': (data: VoteProgress) => void;
  'progress:vote_updated': (data: VoteProgress) => void;
  'progress:all_voted': () => void;
}
```

## Error Handling

### 1. Vote Errors
```typescript
interface VoteError {
  type: VoteErrorType;
  userId: string;
  attemptedVote: string;
  reason: string;
  timestamp: Date;
}

type VoteErrorType =
  | 'invalid_vote'
  | 'duplicate_vote'
  | 'late_vote'
  | 'unauthorized_vote';
```

### 2. Session Errors
```typescript
interface SessionError {
  type: SessionErrorType;
  sessionId: string;
  details: string;
  recovery: RecoveryAction;
}

type SessionErrorType =
  | 'initiation_failed'
  | 'reveal_failed'
  | 'completion_failed'
  | 'reset_failed';
```

## Statistics and Analytics

### 1. Vote Statistics
```typescript
interface VotingStatistics {
  mean: number;
  median: string;
  mode: string[];
  standardDeviation: number;
  consensus: boolean;
  outliers: VoteData[];
}
```

### 2. Session Analytics
```typescript
interface SessionAnalytics {
  duration: number;
  participationRate: number;
  consensusAchieved: boolean;
  voteChanges: number;
  finalEstimate: string;
}
```

## Security Considerations

### 1. Vote Integrity
- Prevent duplicate votes
- Validate vote values
- Track vote modifications
- Ensure proper permissions

### 2. Session Security
- Validate session state transitions
- Enforce host-only actions
- Prevent unauthorized reveals
- Secure vote storage 