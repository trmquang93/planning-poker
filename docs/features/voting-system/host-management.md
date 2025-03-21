# Host Management

## Overview
The host management system handles the assignment, transfer, and monitoring of the host role within a planning poker room. It ensures continuous operation even when the current host disconnects.

## Host Role Responsibilities

### 1. Story Management
- Start voting sessions
- Add new stories
- Manage story order
- Archive completed stories

### 2. Voting Control
- Reveal votes
- Reset voting
- Complete voting sessions
- Finalize story estimates

### 3. Room Management
- Transfer host role
- Monitor participant status
- Manage voting scales

## Host Transfer Scenarios

### 1. Manual Transfer
```typescript
interface ManualTransfer {
  fromUserId: string;
  toUserId: string;
  timestamp: Date;
  reason: 'manual';
  acknowledgment: boolean;
}
```

### 2. Automatic Transfer (Disconnection)
```typescript
interface AutomaticTransfer {
  fromUserId: string;
  toUserId: string;
  timestamp: Date;
  reason: 'disconnection';
  disconnectionTime: Date;
  selectionCriteria: TransferCriteria;
}
```

### 3. Host Rejoin
```typescript
interface HostRejoin {
  userId: string;
  timestamp: Date;
  previousRole: 'host' | 'participant';
  newRole: 'host' | 'participant';
}
```

## Host Selection Algorithm

### 1. Automatic Selection Criteria
```typescript
interface TransferCriteria {
  connectionStability: number;  // 0-1
  participationDuration: number;  // minutes
  previousHostExperience: boolean;
  activeParticipation: boolean;
}
```

### 2. Selection Process
1. Filter eligible participants
2. Sort by selection criteria
3. Select highest-ranking participant
4. Notify all room members
5. Wait for acknowledgment
6. Fallback to next candidate if needed

## State Management

### 1. Host State
```typescript
interface HostState {
  currentHost: User;
  previousHost?: User;
  transferHistory: HostTransfer[];
  status: HostStatus;
  lastActivity: Date;
}

type HostStatus = 'active' | 'disconnected' | 'transferring';
```

### 2. Transfer State
```typescript
interface TransferState {
  inProgress: boolean;
  fromUserId: string;
  toUserId: string;
  startTime: Date;
  status: TransferStatus;
  retryCount: number;
}

type TransferStatus = 'pending' | 'acknowledged' | 'completed' | 'failed';
```

## Error Handling

### 1. Transfer Failures
```typescript
interface TransferError {
  type: TransferErrorType;
  timestamp: Date;
  details: string;
  recovery: RecoveryAction;
}

type TransferErrorType = 
  | 'target_unavailable'
  | 'acknowledgment_timeout'
  | 'concurrent_transfer'
  | 'invalid_state';
```

### 2. Recovery Strategies
```typescript
interface RecoveryStrategy {
  error: TransferErrorType;
  maxRetries: number;
  backoffPeriod: number;
  alternativeAction: RecoveryAction;
}
```

## UI Components

### 1. Host Controls
```typescript
interface HostControls {
  canTransfer: boolean;
  availableTargets: User[];
  transferInProgress: boolean;
  showTransferDialog: boolean;
}
```

### 2. Transfer Dialog
```typescript
interface TransferDialog {
  selectedUser?: User;
  confirmationRequired: boolean;
  showWarnings: boolean;
  transferStatus: TransferStatus;
}
```

## Socket Events

### 1. Host Events
```typescript
interface HostEvents {
  'host:transfer:request': (data: TransferRequest) => void;
  'host:transfer:accept': (data: TransferAcceptance) => void;
  'host:transfer:complete': (data: TransferCompletion) => void;
  'host:disconnect': (data: HostDisconnection) => void;
  'host:rejoin': (data: HostRejoin) => void;
}
```

### 2. Error Events
```typescript
interface ErrorEvents {
  'host:transfer:failed': (data: TransferError) => void;
  'host:invalid_operation': (data: OperationError) => void;
}
```

## Security Considerations

### 1. Transfer Validation
- Verify current host authority
- Validate target user eligibility
- Ensure no concurrent transfers
- Check room state compatibility

### 2. Permission Updates
- Immediate permission revocation
- Gradual permission grant
- State-dependent permission checks
- Action audit logging 