import type { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketEvents, JoinSessionEventSchema, ErrorEventSchema } from '../shared/types';
import { SessionService } from './sessionService';

const sessionService = SessionService.getInstance();

// Track socket connections
const socketToSession = new Map<string, { sessionId: string; participantId: string }>();

export const setupSocketHandlers = (io: SocketIOServer): void => {
  io.on('connection', (socket: Socket) => {
    console.info(`Client connected: ${socket.id} from origin: ${socket.request.headers.origin}`);
    
    // Clean up any existing connections for this socket
    const existingConnection = socketToSession.get(socket.id);
    if (existingConnection) {
      console.info(`Cleaning up existing connection for socket: ${socket.id}`);
      socketToSession.delete(socket.id);
    }
    
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

        // Add story using SessionService
        const updatedSession = sessionService.addStory(
          connection.sessionId,
          connection.participantId,
          data.title,
          data.description
        );

        if (!updatedSession) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Failed to add story',
            code: 'ADD_STORY_FAILED',
          });
          return;
        }

        // Broadcast updated session to all participants
        io.to(connection.sessionId).emit(SocketEvents.SESSION_UPDATED, {
          session: updatedSession,
        });

        // Note: No need to emit STORY_ADDED separately since SESSION_UPDATED 
        // already contains the complete session with the new story

        console.info(`Story added to session ${connection.sessionId}:`, data.title);
      } catch (error) {
        console.error('Error adding story:', error);
        socket.emit(SocketEvents.ERROR, {
          message: error instanceof Error ? error.message : 'Failed to add story',
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

        // Start voting using SessionService
        const updatedSession = sessionService.startVoting(
          connection.sessionId,
          connection.participantId,
          data.storyId
        );

        if (!updatedSession) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Failed to start voting',
            code: 'START_VOTING_FAILED',
          });
          return;
        }

        // Broadcast updated session to all participants
        io.to(connection.sessionId).emit(SocketEvents.SESSION_UPDATED, {
          session: updatedSession,
        });

        // Broadcast voting start event
        io.to(connection.sessionId).emit(SocketEvents.VOTING_STARTED, {
          storyId: data.storyId,
          sessionId: connection.sessionId,
        });

        console.info(`Voting started for story ${data.storyId} in session ${connection.sessionId}`);
      } catch (error) {
        console.error('Error starting voting:', error);
        socket.emit(SocketEvents.ERROR, {
          message: error instanceof Error ? error.message : 'Failed to start voting',
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

        // Submit vote using SessionService
        const updatedSession = sessionService.submitVote(
          connection.sessionId,
          connection.participantId,
          data.storyId,
          data.vote
        );

        if (!updatedSession) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Failed to submit vote',
            code: 'SUBMIT_VOTE_FAILED',
          });
          return;
        }

        // Send personalized session updates to each participant
        try {
          const currentStory = updatedSession.stories.find(s => s.id === data.storyId);
          if (currentStory) {
            // Send to each participant individually with their own vote visible
            updatedSession.participants.forEach(participant => {
              try {
                const participantSockets = [...socketToSession.entries()]
                  .filter(([, connection]) => 
                    connection.sessionId === updatedSession.id && 
                    connection.participantId === participant.id
                  )
                  .map(([socketId]) => socketId);

                if (participantSockets.length > 0) {
                  // Create personalized session for this participant
                  const personalizedSession = {
                    ...updatedSession,
                    stories: updatedSession.stories.map(story => {
                      if (story.id === data.storyId && story.status === 'voting') {
                        // Show this participant's own vote, hide others
                        const personalizedVotes: Record<string, string | number> = {};
                        Object.entries(story.votes).forEach(([voterName, vote]) => {
                          if (voterName === participant.name) {
                            personalizedVotes[voterName] = vote; // Show own vote
                          } else {
                            personalizedVotes[voterName] = '***'; // Hide others' votes
                          }
                        });
                        return {
                          ...story,
                          votes: personalizedVotes,
                        };
                      }
                      return story;
                    })
                  };

                  // Send to this participant's sockets
                  participantSockets.forEach(socketId => {
                    io.to(socketId).emit(SocketEvents.SESSION_UPDATED, {
                      session: personalizedSession,
                    });
                  });
                }
              } catch (participantError) {
                console.error(`Error sending personalized update to participant ${participant.id}:`, participantError);
              }
            });
          }
        } catch (error) {
          console.error('Error creating personalized session updates:', error);
          // Fallback: send basic vote count update without revealing votes
          const fallbackStory = updatedSession.stories.find(s => s.id === data.storyId);
          io.to(connection.sessionId).emit(SocketEvents.VOTE_SUBMITTED, {
            participantId: connection.participantId,
            storyId: data.storyId,
            hasVoted: true,
            voteCount: fallbackStory ? Object.keys(fallbackStory.votes).length : 0,
            totalParticipants: updatedSession.participants.length,
            sessionId: connection.sessionId,
          });
        }

        console.info(`Vote submitted by ${connection.participantId} for story ${data.storyId}`);
      } catch (error) {
        console.error('Error submitting vote:', error);
        socket.emit(SocketEvents.ERROR, {
          message: error instanceof Error ? error.message : 'Failed to submit vote',
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

        // Reveal votes using SessionService
        const updatedSession = sessionService.revealVotes(
          connection.sessionId,
          connection.participantId,
          data.storyId
        );

        if (!updatedSession) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Failed to reveal votes',
            code: 'REVEAL_VOTES_FAILED',
          });
          return;
        }

        // Get the story with revealed votes
        const story = updatedSession.stories.find(s => s.id === data.storyId);
        if (!story) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Story not found',
            code: 'STORY_NOT_FOUND',
          });
          return;
        }

        // Broadcast updated session to all participants
        io.to(connection.sessionId).emit(SocketEvents.SESSION_UPDATED, {
          session: updatedSession,
        });

        // Broadcast votes revealed event with actual votes
        io.to(connection.sessionId).emit(SocketEvents.VOTES_REVEALED, {
          storyId: data.storyId,
          votes: story.votes,
          sessionId: connection.sessionId,
        });

        console.info(`Votes revealed for story ${data.storyId} in session ${connection.sessionId}`);
      } catch (error) {
        console.error('Error revealing votes:', error);
        socket.emit(SocketEvents.ERROR, {
          message: error instanceof Error ? error.message : 'Failed to reveal votes',
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

        // Finalize estimate using SessionService
        const updatedSession = sessionService.finalizeEstimate(
          connection.sessionId,
          connection.participantId,
          data.storyId,
          data.estimate
        );

        if (!updatedSession) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Failed to set final estimate',
            code: 'SET_ESTIMATE_FAILED',
          });
          return;
        }

        // Broadcast updated session to all participants
        io.to(connection.sessionId).emit(SocketEvents.SESSION_UPDATED, {
          session: updatedSession,
        });

        // Broadcast final estimate set event
        io.to(connection.sessionId).emit(SocketEvents.FINAL_ESTIMATE_SET, {
          storyId: data.storyId,
          estimate: data.estimate,
          sessionId: connection.sessionId,
        });

        console.info(`Final estimate set for story ${data.storyId}: ${data.estimate}`);
      } catch (error) {
        console.error('Error setting final estimate:', error);
        socket.emit(SocketEvents.ERROR, {
          message: error instanceof Error ? error.message : 'Failed to set final estimate',
          code: 'SET_ESTIMATE_FAILED',
        });
      }
    });

    // Handle revoting
    socket.on(SocketEvents.REVOTE_STORY, (data) => {
      try {
        const connection = socketToSession.get(socket.id);
        if (!connection) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Not connected to any session',
            code: 'NOT_IN_SESSION',
          });
          return;
        }

        // Start revoting using SessionService
        const updatedSession = sessionService.revoteStory(
          connection.sessionId,
          connection.participantId,
          data.storyId
        );

        if (!updatedSession) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Failed to start revoting',
            code: 'REVOTE_FAILED',
          });
          return;
        }

        // Broadcast updated session to all participants
        io.to(connection.sessionId).emit(SocketEvents.SESSION_UPDATED, {
          session: updatedSession,
        });

        // Broadcast revote started event
        io.to(connection.sessionId).emit(SocketEvents.REVOTE_STARTED, {
          storyId: data.storyId,
          sessionId: connection.sessionId,
        });

        console.info(`Revoting started for story ${data.storyId} in session ${connection.sessionId}`);
      } catch (error) {
        console.error('Error starting revote:', error);
        socket.emit(SocketEvents.ERROR, {
          message: error instanceof Error ? error.message : 'Failed to start revoting',
          code: 'REVOTE_FAILED',
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