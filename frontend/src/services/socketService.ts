import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@shared/types';
import type { Session, Participant } from '@shared/types';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private sessionId: string | null = null;
  private participantId: string | null = null;

  // Event listeners
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  /**
   * Connect to the WebSocket server
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket && this.isConnected) {
        console.info('Already connected to socket');
        resolve();
        return;
      }

      const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
      console.info('Attempting to connect to socket server:', serverUrl);
      
      this.socket = io(serverUrl, {
        transports: ['polling'],
        timeout: 10000,
        forceNew: true,
      });

      this.socket.on('connect', () => {
        console.info('Connected to Planning Poker server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        console.error('Error details:', error.message);
        this.isConnected = false;
        reject(error);
      });

      this.socket.on('disconnect', (reason) => {
        console.info('Disconnected from server:', reason);
        this.isConnected = false;
        this.emit('connection_lost', reason);
        
        // Attempt reconnection for certain disconnect reasons
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, don't reconnect automatically
          return;
        }
        
        this.attemptReconnection();
      });

      this.socket.on('welcome', (data) => {
        console.info('Welcome message received:', data);
      });

      // Set up event forwarding
      this.setupEventForwarding();
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.sessionId = null;
      this.participantId = null;
    }
  }

  /**
   * Join a session
   */
  public joinSession(sessionId: string, participant: Participant): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    this.sessionId = sessionId;
    this.participantId = participant.id;

    this.socket.emit(SocketEvents.JOIN_SESSION, {
      sessionId,
      participant,
    });
  }

  /**
   * Leave current session
   */
  public leaveSession(): void {
    if (!this.isConnected || !this.socket) {
      return;
    }

    this.socket.emit(SocketEvents.LEAVE_SESSION);
    this.sessionId = null;
    this.participantId = null;
  }

  /**
   * Add a story to the session
   */
  public addStory(title: string, description?: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    this.socket.emit(SocketEvents.ADD_STORY, {
      title,
      description,
    });
  }

  /**
   * Start voting on a story
   */
  public startVoting(storyId: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    this.socket.emit(SocketEvents.START_VOTING, {
      storyId,
    });
  }

  /**
   * Submit a vote for a story
   */
  public submitVote(storyId: string, vote: string | number): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    this.socket.emit(SocketEvents.SUBMIT_VOTE, {
      storyId,
      vote,
    });
  }

  /**
   * Reveal votes for a story
   */
  public revealVotes(storyId: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    this.socket.emit(SocketEvents.REVEAL_VOTES, {
      storyId,
    });
  }

  /**
   * Set final estimate for a story
   */
  public setFinalEstimate(storyId: string, estimate: string | number): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    this.socket.emit(SocketEvents.SET_FINAL_ESTIMATE, {
      storyId,
      estimate,
    });
  }

  /**
   * Add event listener
   */
  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Remove event listener
   */
  public off(event: string, callback: (...args: any[]) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  /**
   * Emit event to local listeners
   */
  private emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Get connection status
   */
  public get connected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current session ID
   */
  public get currentSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get current participant ID
   */
  public get currentParticipantId(): string | null {
    return this.participantId;
  }

  /**
   * Setup event forwarding from socket to local listeners
   */
  private setupEventForwarding(): void {
    if (!this.socket) return;

    // Forward all socket events to local listeners
    const events = [
      SocketEvents.SESSION_UPDATED,
      SocketEvents.PARTICIPANT_JOINED,
      SocketEvents.PARTICIPANT_LEFT,
      SocketEvents.STORY_ADDED,
      SocketEvents.VOTING_STARTED,
      SocketEvents.VOTE_SUBMITTED,
      SocketEvents.VOTES_REVEALED,
      SocketEvents.FINAL_ESTIMATE_SET,
      SocketEvents.ERROR,
    ];

    events.forEach(event => {
      this.socket!.on(event, (...args: any[]) => {
        this.emit(event, ...args);
      });
    });
  }

  /**
   * Attempt to reconnect to the server
   */
  private attemptReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnection_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    console.info(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect()
          .then(() => {
            this.emit('reconnected');
            // Rejoin session if we were in one
            if (this.sessionId && this.participantId) {
              // Note: We'll need to get participant data from store
              this.emit('rejoin_session_needed', this.sessionId, this.participantId);
            }
          })
          .catch(() => {
            this.attemptReconnection();
          });
      }
    }, delay);
  }
}

// Export singleton instance
export const socketService = new SocketService();