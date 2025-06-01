import type { Server as SocketIOServer, Socket } from 'socket.io';
import { SocketEvents, JoinSessionEventSchema, TransferFacilitatorRequestSchema } from '../shared/types';
import { SessionService } from './sessionService';

const sessionService = SessionService.getInstance();

// Track socket connections
const socketToSession = new Map<string, { sessionId: string; participantId: string }>();

// Track facilitator disconnection timeouts
const facilitatorTimeouts = new Map<string, NodeJS.Timeout>();

export const setupSocketHandlers = (io: SocketIOServer): void => {
  io.on('connection', (socket: Socket) => {
    console.info(`Client connected: ${socket.id} from origin: ${socket.request.headers.origin}`);
    
    // Check if this is a refresh request
    const query = socket.handshake.query;
    const isRefresh = query.refresh === 'true';
    
    if (isRefresh) {
      console.info(`Detected page refresh for socket: ${socket.id}`);
      // Clear any stale connections that might be causing issues
      const staleSockets = [...socketToSession.entries()].filter(([socketId, connection]) => {
        // Remove connections that aren't from recent timestamps
        const socketCreatedTime = parseInt(query.t as string) || Date.now();
        const timeDiff = Date.now() - socketCreatedTime;
        return timeDiff > 60000; // Remove connections older than 1 minute
      });
      
      staleSockets.forEach(([socketId]) => {
        console.info(`Removing stale socket connection: ${socketId}`);
        socketToSession.delete(socketId);
      });
    }
    
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
      isRefresh: isRefresh,
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
        console.info(`🔌 Socket ${socket.id} joined room ${validated.sessionId}`);
        
        // Track socket connection
        socketToSession.set(socket.id, {
          sessionId: validated.sessionId,
          participantId: validated.participant.id,
        });

        // Update participant online status
        const statusUpdateResult = sessionService.updateParticipantStatus(validated.sessionId, validated.participant.id, true);
        console.info(`👤 Updated participant status for ${validated.participant.name}:`, statusUpdateResult ? 'Success' : 'Failed');

        // Get updated session after status change
        const updatedSession = sessionService.getSession(validated.sessionId);
        console.info(`📊 Session after join - Participants:`, updatedSession?.participants.map(p => ({ name: p.name, isOnline: p.isOnline })));

        // Send updated session to ALL participants (including the joining one)
        io.to(validated.sessionId).emit(SocketEvents.SESSION_UPDATED, {
          session: updatedSession,
        });
        console.info(`📤 Sent SESSION_UPDATED to ALL participants in session ${validated.sessionId}`);

        // Also send specific participant joined event for any special handling
        socket.to(validated.sessionId).emit(SocketEvents.PARTICIPANT_JOINED, {
          participant: validated.participant,
          sessionId: validated.sessionId,
        });
        console.info(`📢 Sent PARTICIPANT_JOINED to other participants about ${validated.participant.name}`);

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
      await handleParticipantLeave(socket, io);
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

    // Handle facilitator transfer
    socket.on(SocketEvents.TRANSFER_FACILITATOR, (data) => {
      try {
        // Validate request data
        const validationResult = TransferFacilitatorRequestSchema.safeParse(data);
        if (!validationResult.success) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Invalid transfer facilitator request',
            code: 'INVALID_REQUEST',
          });
          return;
        }

        const connection = socketToSession.get(socket.id);
        if (!connection) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Not connected to any session',
            code: 'NOT_IN_SESSION',
          });
          return;
        }

        // Transfer facilitator role using SessionService
        const updatedSession = sessionService.transferFacilitatorRole(
          connection.sessionId,
          connection.participantId,
          data.newFacilitatorId
        );

        if (!updatedSession) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Failed to transfer facilitator role',
            code: 'TRANSFER_FACILITATOR_FAILED',
          });
          return;
        }

        // Get participant names for the event
        const oldFacilitator = updatedSession.participants.find(p => p.id === connection.participantId);
        const newFacilitator = updatedSession.participants.find(p => p.id === data.newFacilitatorId);

        // Clear any pending facilitator timeout for this session
        const timeoutKey = connection.sessionId;
        if (facilitatorTimeouts.has(timeoutKey)) {
          clearTimeout(facilitatorTimeouts.get(timeoutKey)!);
          facilitatorTimeouts.delete(timeoutKey);
          console.info(`Cleared facilitator timeout for session ${connection.sessionId} due to manual transfer`);
        }

        // Broadcast updated session to all participants
        io.to(connection.sessionId).emit(SocketEvents.SESSION_UPDATED, {
          session: updatedSession,
        });

        // Broadcast facilitator transferred event
        io.to(connection.sessionId).emit(SocketEvents.FACILITATOR_TRANSFERRED, {
          sessionId: connection.sessionId,
          oldFacilitatorId: connection.participantId,
          newFacilitatorId: data.newFacilitatorId,
          newFacilitatorName: newFacilitator?.name || 'Unknown',
        });

        console.info(`Facilitator role transferred from ${oldFacilitator?.name} to ${newFacilitator?.name} in session ${connection.sessionId}`);
      } catch (error) {
        console.error('Error transferring facilitator role:', error);
        socket.emit(SocketEvents.ERROR, {
          message: error instanceof Error ? error.message : 'Failed to transfer facilitator role',
          code: 'TRANSFER_FACILITATOR_FAILED',
        });
      }
    });

    // Handle facilitator volunteer request
    socket.on(SocketEvents.REQUEST_FACILITATOR, (data) => {
      try {
        const connection = socketToSession.get(socket.id);
        if (!connection) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Not connected to any session',
            code: 'NOT_IN_SESSION',
          });
          return;
        }

        // Get the current session
        const session = sessionService.getSession(connection.sessionId);
        if (!session) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Session not found',
            code: 'SESSION_NOT_FOUND',
          });
          return;
        }

        // Check if there are any online facilitators
        const onlineFacilitators = session.participants.filter(p => p.role === 'facilitator' && p.isOnline);
        if (onlineFacilitators.length > 0) {
          socket.emit(SocketEvents.ERROR, {
            message: 'There is already an online facilitator',
            code: 'FACILITATOR_AVAILABLE',
          });
          return;
        }

        // Check if the requesting participant is a member
        const requestingParticipant = session.participants.find(p => p.id === connection.participantId);
        if (!requestingParticipant || requestingParticipant.role !== 'member') {
          socket.emit(SocketEvents.ERROR, {
            message: 'Only members can volunteer to become facilitator',
            code: 'INVALID_VOLUNTEER',
          });
          return;
        }

        // Promote the requesting participant to facilitator
        const updatedSession = sessionService.transferFacilitatorRole(
          connection.sessionId,
          'system', // Use system as the old facilitator ID when promoting volunteer
          connection.participantId
        );

        if (!updatedSession) {
          socket.emit(SocketEvents.ERROR, {
            message: 'Failed to promote volunteer to facilitator',
            code: 'VOLUNTEER_PROMOTION_FAILED',
          });
          return;
        }

        // Clear the facilitator timeout for this session
        const timeoutKey = connection.sessionId;
        if (facilitatorTimeouts.has(timeoutKey)) {
          clearTimeout(facilitatorTimeouts.get(timeoutKey)!);
          facilitatorTimeouts.delete(timeoutKey);
          console.info(`Cleared facilitator timeout for session ${connection.sessionId} due to volunteer promotion`);
        }

        // Broadcast updated session to all participants
        io.to(connection.sessionId).emit(SocketEvents.SESSION_UPDATED, {
          session: updatedSession,
        });

        // Broadcast facilitator transferred event (volunteer promoted)
        io.to(connection.sessionId).emit(SocketEvents.FACILITATOR_TRANSFERRED, {
          sessionId: connection.sessionId,
          oldFacilitatorId: 'system',
          newFacilitatorId: connection.participantId,
          newFacilitatorName: requestingParticipant.name,
        });

        console.info(`${requestingParticipant.name} volunteered and was promoted to facilitator in session ${connection.sessionId}`);
      } catch (error) {
        console.error('Error handling facilitator volunteer request:', error);
        socket.emit(SocketEvents.ERROR, {
          message: error instanceof Error ? error.message : 'Failed to process volunteer request',
          code: 'VOLUNTEER_REQUEST_FAILED',
        });
      }
    });

    // Handle ping/pong for connection health checks
    socket.on('ping', (data) => {
      // Respond to ping with pong to verify connection health
      socket.emit('pong', { 
        id: data?.id,
        timestamp: Date.now(),
        serverTime: new Date().toISOString()
      });
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      console.info(`Client disconnected: ${socket.id}, reason: ${reason}`);
      await handleParticipantLeave(socket, io);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  console.info('Socket.IO handlers set up successfully');
};

// Helper function to handle participant leaving
async function handleParticipantLeave(socket: Socket, io: SocketIOServer): Promise<void> {
  const connection = socketToSession.get(socket.id);
  if (!connection) {
    return;
  }

  try {
    // Get the session before updating status to check if participant was a facilitator
    const sessionBeforeUpdate = sessionService.getSession(connection.sessionId);
    const departingParticipant = sessionBeforeUpdate?.participants.find(p => p.id === connection.participantId);
    const wasFacilitator = departingParticipant?.role === 'facilitator';

    // Update participant online status
    const updatedSession = sessionService.updateParticipantStatus(
      connection.sessionId, 
      connection.participantId, 
      false
    );

    if (updatedSession) {
      // Notify other participants about the leave
      socket.to(connection.sessionId).emit(SocketEvents.PARTICIPANT_LEFT, {
        participantId: connection.participantId,
        sessionId: connection.sessionId,
      });

      // Check if a facilitator disconnected and there are still members online
      if (wasFacilitator && updatedSession.participants.some(p => p.isOnline)) {
        // Check if there are any other online facilitators
        const onlineFacilitators = updatedSession.participants.filter(p => p.role === 'facilitator' && p.isOnline);
        
        if (onlineFacilitators.length === 0) {
          // No online facilitators left - start the timeout and notify members
          console.info(`Facilitator ${departingParticipant?.name} disconnected from session ${connection.sessionId}. Starting 2-minute timeout.`);
          
          // Emit facilitator disconnected event immediately
          io.to(connection.sessionId).emit(SocketEvents.FACILITATOR_DISCONNECTED, {
            sessionId: connection.sessionId,
            facilitatorId: connection.participantId,
            facilitatorName: departingParticipant?.name || 'Unknown',
            disconnectedAt: new Date(),
          });

          // Set up 2-minute timeout
          const timeoutKey = connection.sessionId;
          
          // Clear any existing timeout for this session
          if (facilitatorTimeouts.has(timeoutKey)) {
            clearTimeout(facilitatorTimeouts.get(timeoutKey)!);
          }

          // Start new timeout
          const timeout = setTimeout(() => {
            console.info(`Facilitator timeout expired for session ${connection.sessionId}. Checking for volunteers.`);
            
            // Get current session state
            const currentSession = sessionService.getSession(connection.sessionId);
            if (!currentSession) {
              facilitatorTimeouts.delete(timeoutKey);
              return;
            }

            // Check if there are still no online facilitators
            const currentOnlineFacilitators = currentSession.participants.filter(p => p.role === 'facilitator' && p.isOnline);
            if (currentOnlineFacilitators.length === 0) {
              // Still no facilitators - the volunteer UI should already be showing
              // No automatic promotion - let the volunteer system handle it
              console.info(`No facilitators available for session ${connection.sessionId}. Volunteer system should be active.`);
            } else {
              // A facilitator came back online during the timeout period
              console.info(`Facilitator returned during timeout period for session ${connection.sessionId}. Canceling volunteer system.`);
            }

            // Clean up the timeout
            facilitatorTimeouts.delete(timeoutKey);
          }, 2 * 60 * 1000); // 2 minutes

          facilitatorTimeouts.set(timeoutKey, timeout);
        }
      }

      // Broadcast updated session to ALL remaining participants
      io.to(connection.sessionId).emit(SocketEvents.SESSION_UPDATED, {
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