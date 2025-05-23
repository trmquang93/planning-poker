import { z } from 'zod';

// Estimation scales
export const ESTIMATION_SCALES = {
  FIBONACCI: [1, 2, 3, 5, 8, 13, 21, '?', '∞'] as const,
  T_SHIRT: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '?', '∞'] as const,
  POWERS_OF_2: [1, 2, 4, 8, 16, 32, 64, '?', '∞'] as const,
} as const;

export type EstimationScale = keyof typeof ESTIMATION_SCALES;
export type EstimationValue = string | number;

// Session schemas
export const SessionStatus = z.enum(['waiting', 'voting', 'revealing', 'completed']);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const StoryStatus = z.enum(['pending', 'voting', 'completed']);
export type StoryStatus = z.infer<typeof StoryStatus>;

export const ParticipantRole = z.enum(['facilitator', 'member']);
export type ParticipantRole = z.infer<typeof ParticipantRole>;

// Core entities
export const ParticipantSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  role: ParticipantRole,
  isOnline: z.boolean(),
  joinedAt: z.date(),
});

export const StorySchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  status: StoryStatus,
  votes: z.record(z.string(), z.union([z.string(), z.number()])),
  finalEstimate: z.union([z.string(), z.number()]).optional(),
  createdAt: z.date(),
  completedAt: z.date().optional(),
});

export const SessionSchema = z.object({
  id: z.string(),
  code: z.string().length(6),
  title: z.string().min(1).max(100),
  scale: z.enum(['FIBONACCI', 'T_SHIRT', 'POWERS_OF_2']),
  status: SessionStatus,
  participants: z.array(ParticipantSchema),
  stories: z.array(StorySchema),
  currentStoryId: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date(),
});

// API request/response schemas
export const CreateSessionRequestSchema = z.object({
  title: z.string().min(1).max(100),
  facilitatorName: z.string().min(1).max(50),
  scale: z.enum(['FIBONACCI', 'T_SHIRT', 'POWERS_OF_2']),
});

export const JoinSessionRequestSchema = z.object({
  sessionCode: z.string().length(6),
  participantName: z.string().min(1).max(50),
});

export const AddStoryRequestSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
});

export const SubmitVoteRequestSchema = z.object({
  storyId: z.string(),
  vote: z.union([z.string(), z.number()]),
});

export const SetFinalEstimateRequestSchema = z.object({
  storyId: z.string(),
  estimate: z.union([z.string(), z.number()]),
});

// Socket event schemas
export const SocketEvents = {
  // Client to server
  JOIN_SESSION: 'join_session',
  LEAVE_SESSION: 'leave_session',
  ADD_STORY: 'add_story',
  START_VOTING: 'start_voting',
  SUBMIT_VOTE: 'submit_vote',
  REVEAL_VOTES: 'reveal_votes',
  SET_FINAL_ESTIMATE: 'set_final_estimate',
  NEXT_STORY: 'next_story',
  
  // Server to client
  SESSION_UPDATED: 'session_updated',
  PARTICIPANT_JOINED: 'participant_joined',
  PARTICIPANT_LEFT: 'participant_left',
  STORY_ADDED: 'story_added',
  VOTING_STARTED: 'voting_started',
  VOTE_SUBMITTED: 'vote_submitted',
  VOTES_REVEALED: 'votes_revealed',
  FINAL_ESTIMATE_SET: 'final_estimate_set',
  ERROR: 'error',
} as const;

// Special schema for socket events that handles serialized dates
export const ParticipantEventSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(50),
  role: ParticipantRole,
  isOnline: z.boolean(),
  joinedAt: z.union([z.date(), z.string()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
});

export const JoinSessionEventSchema = z.object({
  sessionId: z.string(),
  participant: ParticipantEventSchema,
});

export const ErrorEventSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
});

// Type exports
export type Participant = z.infer<typeof ParticipantSchema>;
export type Story = z.infer<typeof StorySchema>;
export type Session = z.infer<typeof SessionSchema>;

export type CreateSessionRequest = z.infer<typeof CreateSessionRequestSchema>;
export type JoinSessionRequest = z.infer<typeof JoinSessionRequestSchema>;
export type AddStoryRequest = z.infer<typeof AddStoryRequestSchema>;
export type SubmitVoteRequest = z.infer<typeof SubmitVoteRequestSchema>;
export type SetFinalEstimateRequest = z.infer<typeof SetFinalEstimateRequestSchema>;

export type JoinSessionEvent = z.infer<typeof JoinSessionEventSchema>;
export type ErrorEvent = z.infer<typeof ErrorEventSchema>;

// Session response types
export interface CreateSessionResponse {
  session: Session;
  participantId: string;
}

export interface JoinSessionResponse {
  session: Session;
  participantId: string;
}

export interface SessionSummary {
  sessionId: string;
  title: string;
  totalStories: number;
  completedStories: number;
  participants: string[];
  createdAt: Date;
  completedAt?: Date;
  stories: Array<{
    title: string;
    finalEstimate?: EstimationValue;
    votes: Record<string, EstimationValue>;
  }>;
}

// Export formats
export interface ExportData {
  format: 'csv' | 'text';
  data: string;
  filename: string;
}