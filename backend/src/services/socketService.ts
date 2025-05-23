import type { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketEvents, JoinSessionEventSchema, ErrorEventSchema } from '@shared/types';
import { SessionService } from './sessionService';

const sessionService = SessionService.getInstance();

// Track socket connections
const socketToSession = new Map<string, { sessionId: string; participantId: string }>();

export const setupSocketHandlers = (io: SocketIOServer): void => {
  io.on('connection', (socket: Socket) => {
    console.info(`Client connected: ${socket.id}`);
    
    // Send welcome message
    socket.emit('welcome', {
      message: 'Connected to Planning Poker server',
      socketId: socket.id,
      timestamp: new Date().toISOString(),
    });

    // Handle session joining
    socket.on(SocketEvents.JOIN_SESSION, async (data) => {
      try {
        const validated = JoinSessionEventSchema.parse(data);
        const session = sessionService.getSession(validated.sessionId);
        
        if (!session) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Check if participant exists in session
        const participant = session.participants.find(p => p.id === validated.participant.id);
        if (!participant) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Participant not found in session',
            code: 'PARTICIPANT_NOT_FOUND',
          });
          return;
        }

        // Join socket room
        await socket.join(validated.sessionId);
        
        // Track socket connection
        socketToSession.set(socket.id, {
          sessionId: validated.sessionId,
          participantId: validated.participant.id,
        });

        // Update participant online status
        sessionService.updateParticipantStatus(validated.sessionId, validated.participant.id, true);

        // Notify session of participant join
        socket.to(validated.sessionId).emit(SocketEvents.PARTICIPANT_JOINED, {
          participant: validated.participant,
          sessionId: validated.sessionId,
        });

        // Send updated session to the joining participant
        const updatedSession = sessionService.getSession(validated.sessionId);
        socket.emit(SocketEvents.SESSION_UPDATED, {
          session: updatedSession,
        });

        console.info(`Participant ${validated.participant.name} joined session ${validated.sessionId}`);
      } catch (error) {
        console.error('Error handling join session:', error);
        socket.emit(SocketEvents.ERROR, {
          message: 'Invalid join session data',
          code: 'INVALID_DATA',
        });
      }
    });

    // Handle session leaving
    socket.on(SocketEvents.LEAVE_SESSION, async () => {
      await handleParticipantLeave(socket);
    });

    // Handle adding stories
    socket.on(SocketEvents.ADD_STORY, (data) => {
      try {
        const connection = socketToSession.get(socket.id);
        if (!connection) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Not connected to any session',
            code: 'NOT_IN_SESSION',
          });
          return;
        }

        const session = sessionService.getSession(connection.sessionId);
        if (!session) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Check if participant is facilitator
        const participant = session.participants.find(p => p.id === connection.participantId);
        if (!participant || participant.role !== 'facilitator') {
          socket.emit(SocketEvents.ERROR, {
            message: 'Only facilitators can add stories',
            code: 'INSUFFICIENT_PERMISSIONS',
          });
          return;
        }

        // TODO: Implement story addition in SessionService
        // For now, just broadcast the event
        io.to(connection.sessionId).emit(SocketEvents.STORY_ADDED, {
          story: data,
          sessionId: connection.sessionId,
        });

        console.info(`Story added to session ${connection.sessionId}:`, data.title);
      } catch (error) {
        console.error('Error adding story:', error);
        socket.emit(SocketEvents.ERROR, {
          message: 'Failed to add story',
          code: 'ADD_STORY_FAILED',
        });
      }
    });

    // Handle starting voting
    socket.on(SocketEvents.START_VOTING, (data) => {
      try {
        const connection = socketToSession.get(socket.id);
        if (!connection) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Not connected to any session',
            code: 'NOT_IN_SESSION',
          });
          return;
        }

        const session = sessionService.getSession(connection.sessionId);
        if (!session) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Check if participant is facilitator
        const participant = session.participants.find(p => p.id === connection.participantId);
        if (!participant || participant.role !== 'facilitator') {
          socket.emit(SocketEvents.ERROR, {
            message: 'Only facilitators can start voting',
            code: 'INSUFFICIENT_PERMISSIONS',
          });
          return;
        }

        // Broadcast voting start to all participants
        io.to(connection.sessionId).emit(SocketEvents.VOTING_STARTED, {
          storyId: data.storyId,
          sessionId: connection.sessionId,
        });

        console.info(`Voting started for story ${data.storyId} in session ${connection.sessionId}`);
      } catch (error) {
        console.error('Error starting voting:', error);
        socket.emit(SocketEvents.ERROR, {
          message: 'Failed to start voting',
          code: 'START_VOTING_FAILED',
        });
      }
    });

    // Handle vote submission
    socket.on(SocketEvents.SUBMIT_VOTE, (data) => {
      try {
        const connection = socketToSession.get(socket.id);
        if (!connection) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Not connected to any session',
            code: 'NOT_IN_SESSION',
          });
          return;
        }

        // TODO: Store vote in SessionService
        // For now, just notify facilitators that a vote was submitted
        socket.to(connection.sessionId).emit(SocketEvents.VOTE_SUBMITTED, {
          participantId: connection.participantId,
          storyId: data.storyId,
          hasVoted: true, // Don't reveal the actual vote
          sessionId: connection.sessionId,
        });

        console.info(`Vote submitted by ${connection.participantId} for story ${data.storyId}`);
      } catch (error) {
        console.error('Error submitting vote:', error);
        socket.emit(SocketEvents.ERROR, {
          message: 'Failed to submit vote',
          code: 'SUBMIT_VOTE_FAILED',
        });
      }
    });

    // Handle vote revelation
    socket.on(SocketEvents.REVEAL_VOTES, (data) => {
      try {
        const connection = socketToSession.get(socket.id);
        if (!connection) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Not connected to any session',
            code: 'NOT_IN_SESSION',
          });
          return;
        }

        const session = sessionService.getSession(connection.sessionId);
        if (!session) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Check if participant is facilitator
        const participant = session.participants.find(p => p.id === connection.participantId);
        if (!participant || participant.role !== 'facilitator') {
          socket.emit(SocketEvents.ERROR, {
            message: 'Only facilitators can reveal votes',
            code: 'INSUFFICIENT_PERMISSIONS',
          });
          return;
        }

        // TODO: Get actual votes from SessionService
        // For now, broadcast reveal event
        io.to(connection.sessionId).emit(SocketEvents.VOTES_REVEALED, {
          storyId: data.storyId,
          votes: data.votes || {}, // Placeholder
          sessionId: connection.sessionId,
        });

        console.info(`Votes revealed for story ${data.storyId} in session ${connection.sessionId}`);
      } catch (error) {
        console.error('Error revealing votes:', error);
        socket.emit(SocketEvents.ERROR, {
          message: 'Failed to reveal votes',
          code: 'REVEAL_VOTES_FAILED',
        });
      }
    });

    // Handle setting final estimate
    socket.on(SocketEvents.SET_FINAL_ESTIMATE, (data) => {
      try {
        const connection = socketToSession.get(socket.id);
        if (!connection) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Not connected to any session',
            code: 'NOT_IN_SESSION',
          });
          return;
        }

        const session = sessionService.getSession(connection.sessionId);
        if (!session) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Check if participant is facilitator
        const participant = session.participants.find(p => p.id === connection.participantId);
        if (!participant || participant.role !== 'facilitator') {
          socket.emit(SocketEvents.ERROR, {
            message: 'Only facilitators can set final estimates',
            code: 'INSUFFICIENT_PERMISSIONS',
          });
          return;
        }

        // TODO: Store final estimate in SessionService
        // For now, broadcast the event
        io.to(connection.sessionId).emit(SocketEvents.FINAL_ESTIMATE_SET, {
          storyId: data.storyId,
          estimate: data.estimate,
          sessionId: connection.sessionId,
        });

        console.info(`Final estimate set for story ${data.storyId}: ${data.estimate}`);
      } catch (error) {
        console.error('Error setting final estimate:', error);
        socket.emit(SocketEvents.ERROR, {
          message: 'Failed to set final estimate',
          code: 'SET_ESTIMATE_FAILED',
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      console.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
      await handleParticipantLeave(socket);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.info('Socket.IO handlers set up successfully');
};

// Helper function to handle participant leaving
async function handleParticipantLeave(socket: Socket): Promise<void> {
  const connection = socketToSession.get(socket.id);
  if (!connection) {
    return;
  }

  try {
    // Update participant online status
    const updatedSession = sessionService.updateParticipantStatus(
      connection.sessionId, 
      connection.participantId, 
      false
    );

    if (updatedSession) {
      // Notify other participants
      socket.to(connection.sessionId).emit(SocketEvents.PARTICIPANT_LEFT, {
        participantId: connection.participantId,
        sessionId: connection.sessionId,
      });

      // Broadcast updated session
      socket.to(connection.sessionId).emit(SocketEvents.SESSION_UPDATED, {
        session: updatedSession,
      });
    }

    // Leave socket room
    await socket.leave(connection.sessionId);
    
    // Remove from tracking
    socketToSession.delete(socket.id);

    console.info(`Participant ${connection.participantId} left session ${connection.sessionId}`);
  } catch (error) {
    console.error('Error handling participant leave:', error);
  }
}