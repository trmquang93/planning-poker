import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '../shared/types';
import type { Session, Participant } from '../shared/types';

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private sessionId: string | null = null;
  private participantId: string | null = null;
  private cleanupHandlersAdded = false;

  // Event listeners
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  constructor() {
    this.setupCleanupHandlers();
  }

  /**
   * Setup cleanup handlers to ensure proper disconnection on page unload
   */
  private setupCleanupHandlers(): void {
    if (this.cleanupHandlersAdded || typeof window === 'undefined') {
      return;
    }

    const cleanup = () => {
      if (this.socket) {
        console.info('Cleaning up socket connection due to page unload');
        this.socket.disconnect(); // Disconnect immediately
        this.socket = null;
        this.isConnected = false;
        this.sessionId = null;
        this.participantId = null;
      }
    };

    // Handle actual page unload scenarios (but NOT tab switching)
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('unload', cleanup);
    window.addEventListener('pagehide', cleanup);
    
    // Handle visibility changes for tab switching (keep connection alive)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        console.info('Tab hidden - keeping socket connection alive');
        // Don't disconnect! Just log for debugging
      } else if (document.visibilityState === 'visible') {
        console.info('Tab visible - ensuring socket connection is healthy');
        // Check connection health when tab becomes visible
        this.ensureConnectionHealth();
      }
    });

    this.cleanupHandlersAdded = true;
  }

  /**
   * Ensure connection is healthy when tab becomes visible
   */
  private ensureConnectionHealth(): void {
    if (!this.socket || !this.isConnected) {
      console.info('Connection lost while tab was hidden, attempting reconnection');
      this.attemptReconnection();
    } else {
      // Ping the server to ensure connection is still alive
      this.socket.emit('ping', { timestamp: Date.now() });
      
      // In production, verify we can still send/receive data
      if (window.location.protocol === 'https:') {
        this.verifyConnectionHealth();
      }
    }
  }

  /**
   * Verify connection health in production by testing round-trip communication
   */
  private verifyConnectionHealth(): void {
    if (!this.socket || !this.isConnected) return;

    const healthCheckId = `health_${Date.now()}`;
    const timeout = setTimeout(() => {
      console.warn('Health check timeout - connection may be stale');
      if (this.sessionId && this.participantId) {
        this.attemptReconnection();
      }
    }, 5000);

    // Set up one-time listener for health check response
    const onHealthResponse = (data: { id: string }) => {
      if (data.id === healthCheckId) {
        clearTimeout(timeout);
        console.info('Connection health verified');
        this.socket?.off('pong', onHealthResponse);
      }
    };

    this.socket.on('pong', onHealthResponse);
    this.socket.emit('ping', { id: healthCheckId, timestamp: Date.now() });
  }

  /**
   * Comprehensively clear all Socket.IO related storage
   */
  private async clearSocketIOStorage(): Promise<void> {
    try {
      // Clear localStorage entries
      const localKeysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('socket.io') || key.includes('socketio') || key.includes('engine.io'))) {
          localKeysToRemove.push(key);
        }
      }
      localKeysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear sessionStorage entries
      const sessionKeysToRemove = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.startsWith('socket.io') || key.includes('socketio') || key.includes('engine.io'))) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));

      // Clear IndexedDB entries (Socket.IO might use this)
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          for (const db of databases) {
            if (db.name && (db.name.includes('socket') || db.name.includes('engine'))) {
              indexedDB.deleteDatabase(db.name);
            }
          }
        } catch (e) {
          console.warn('Could not clear IndexedDB:', e);
        }
      }

      console.info('Socket.IO storage cleared successfully');
    } catch (e) {
      console.warn('Could not completely clear Socket.IO storage:', e);
    }
  }

  /**
   * Connect to the WebSocket server
   */
  public async connect(): Promise<void> {
    // Force cleanup of any existing connection
    if (this.socket) {
      console.info('Cleaning up existing socket connection');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }

    // Comprehensive cleanup of any stored Socket.IO state
    await this.clearSocketIOStorage();

    return new Promise((resolve, reject) => {

      const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
      console.info('Attempting to connect to socket server:', serverUrl);
      console.info('Environment variables:', {
        VITE_SOCKET_URL: import.meta.env.VITE_SOCKET_URL,
        VITE_BACKEND_URL: import.meta.env.VITE_BACKEND_URL,
        location: window.location.origin
      });
      
      // Generate unique connection ID to prevent any caching
      const connectionId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      
      // Production-optimized connection with better resilience
      const isProduction = window.location.protocol === 'https:';
      
      this.socket = io(serverUrl, {
        // Use both transports for better production compatibility
        transports: isProduction ? ['websocket', 'polling'] : ['polling'],
        timeout: 20000,
        forceNew: true, // Force completely new connection
        withCredentials: false, // Don't send cookies/credentials
        autoConnect: true,
        upgrade: isProduction, // Allow upgrade to websocket in production
        // Enable reconnection for production to handle hosting platform issues
        reconnection: isProduction,
        reconnectionAttempts: isProduction ? 5 : 0,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        randomizationFactor: 0.5,
        rememberUpgrade: false, // Don't remember transport upgrades
        multiplex: false, // Disable connection multiplexing
        closeOnBeforeunload: true, // Close connection on page unload
        query: {
          t: Date.now(), // Timestamp to force fresh connection
          cid: connectionId, // Unique connection ID
          fresh: 'true', // Flag for fresh connection
          v: '1.0', // Version flag to bypass any caching
          prod: isProduction ? 'true' : 'false' // Production flag
        }
      });

      this.socket.on('connect', () => {
        console.info('Connected to Planning Poker server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error: any) => {
        console.error('Socket connection error:', error);
        console.error('Error details:', {
          message: error.message,
          description: error.description,
          context: error.context,
          type: error.type
        });
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
   * Start revoting on a completed story
   */
  public revoteStory(storyId: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    this.socket.emit(SocketEvents.REVOTE_STORY, {
      storyId,
    });
  }

  /**
   * Transfer facilitator role to another participant
   */
  public transferFacilitator(newFacilitatorId: string): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    this.socket.emit(SocketEvents.TRANSFER_FACILITATOR, {
      newFacilitatorId,
    });
  }

  /**
   * Request to become facilitator (volunteer system)
   */
  public requestFacilitator(): void {
    if (!this.isConnected || !this.socket) {
      throw new Error('Not connected to server');
    }

    this.socket.emit(SocketEvents.REQUEST_FACILITATOR, {});
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
      SocketEvents.REVOTE_STARTED,
      SocketEvents.FACILITATOR_TRANSFERRED,
      SocketEvents.FACILITATOR_DISCONNECTED,
      SocketEvents.ERROR,
    ];

    events.forEach(event => {
      this.socket!.on(event, (...args: any[]) => {
        this.emit(event, ...args);
      });
    });
  }

  /**
   * Attempt to reconnect to the server with production-specific logic
   */
  private attemptReconnection(): void {
    const isProduction = window.location.protocol === 'https:';
    const maxAttempts = isProduction ? 8 : this.maxReconnectAttempts;
    
    if (this.reconnectAttempts >= maxAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('reconnection_failed');
      return;
    }

    this.reconnectAttempts++;
    // Use more aggressive reconnection in production
    const baseDelay = isProduction ? 2000 : 1000;
    const delay = Math.min(baseDelay * Math.pow(1.5, this.reconnectAttempts), 15000);
    
    console.info(`Attempting reconnection ${this.reconnectAttempts}/${maxAttempts} in ${delay}ms (production: ${isProduction})`);
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.connect()
          .then(() => {
            console.info('Reconnection successful');
            this.emit('reconnected');
            // Rejoin session if we were in one
            if (this.sessionId && this.participantId) {
              // Note: We'll need to get participant data from store
              this.emit('rejoin_session_needed', this.sessionId, this.participantId);
            }
          })
          .catch((error) => {
            console.warn(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
            this.attemptReconnection();
          });
      }
    }, delay);
  }
}

// Export singleton instance
export const socketService = new SocketService();