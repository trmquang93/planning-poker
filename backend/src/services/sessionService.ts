import type { Session, Participant, CreateSessionRequest, JoinSessionRequest } from '@shared/types';
import { 
  generateSessionId, 
  generateSessionCode, 
  generateParticipantId,
  getSessionExpiryTime,
  isSessionExpired 
} from '@shared/utils';

// In-memory storage for sessions
const sessions = new Map<string, Session>();
const sessionsByCode = new Map<string, string>(); // code -> sessionId mapping

// Session cleanup interval (every 30 minutes)
const CLEANUP_INTERVAL = 30 * 60 * 1000;

export class SessionService {
  private static instance: SessionService;
  private cleanupTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startCleanupTimer();
  }

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  /**
   * Create a new session
   */
  public createSession(request: CreateSessionRequest): { session: Session; participantId: string } {
    const sessionId = generateSessionId();
    const sessionCode = this.generateUniqueCode();
    const facilitatorId = generateParticipantId();
    
    const facilitator: Participant = {
      id: facilitatorId,
      name: request.facilitatorName,
      role: 'facilitator',
      isOnline: true,
      joinedAt: new Date(),
    };

    const session: Session = {
      id: sessionId,
      code: sessionCode,
      title: request.title,
      scale: request.scale,
      status: 'waiting',
      participants: [facilitator],
      stories: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: getSessionExpiryTime(new Date()),
    };

    sessions.set(sessionId, session);
    sessionsByCode.set(sessionCode, sessionId);

    return { session, participantId: facilitatorId };
  }

  /**
   * Join an existing session
   */
  public joinSession(request: JoinSessionRequest): { session: Session; participantId: string } {
    const sessionId = sessionsByCode.get(request.sessionCode);
    if (!sessionId) {
      throw new Error('Session not found');
    }

    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (isSessionExpired(session.expiresAt)) {
      this.deleteSession(sessionId);
      throw new Error('Session has expired');
    }

    // Check if participant name already exists
    const existingParticipant = session.participants.find(
      p => p.name.toLowerCase() === request.participantName.toLowerCase()
    );
    
    if (existingParticipant) {
      throw new Error('Participant name already exists in this session');
    }

    const participantId = generateParticipantId();
    const participant: Participant = {
      id: participantId,
      name: request.participantName,
      role: 'member',
      isOnline: true,
      joinedAt: new Date(),
    };

    session.participants.push(participant);
    session.updatedAt = new Date();

    sessions.set(sessionId, session);

    return { session, participantId };
  }

  /**
   * Get session by ID
   */
  public getSession(sessionId: string): Session | null {
    const session = sessions.get(sessionId);
    if (!session) {
      return null;
    }

    if (isSessionExpired(session.expiresAt)) {
      this.deleteSession(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Get session by code
   */
  public getSessionByCode(code: string): Session | null {
    const sessionId = sessionsByCode.get(code);
    if (!sessionId) {
      return null;
    }
    return this.getSession(sessionId);
  }

  /**
   * Update participant online status
   */
  public updateParticipantStatus(sessionId: string, participantId: string, isOnline: boolean): Session | null {
    const session = sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const participant = session.participants.find(p => p.id === participantId);
    if (!participant) {
      return null;
    }

    participant.isOnline = isOnline;
    session.updatedAt = new Date();

    sessions.set(sessionId, session);
    return session;
  }

  /**
   * Remove participant from session
   */
  public removeParticipant(sessionId: string, participantId: string): Session | null {
    const session = sessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.participants = session.participants.filter(p => p.id !== participantId);
    session.updatedAt = new Date();

    // If no participants left, delete the session
    if (session.participants.length === 0) {
      this.deleteSession(sessionId);
      return null;
    }

    sessions.set(sessionId, session);
    return session;
  }

  /**
   * Delete a session
   */
  public deleteSession(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) {
      return false;
    }

    sessions.delete(sessionId);
    sessionsByCode.delete(session.code);
    return true;
  }

  /**
   * Get all active sessions (for admin/debugging)
   */
  public getAllSessions(): Session[] {
    return Array.from(sessions.values()).filter(session => !isSessionExpired(session.expiresAt));
  }

  /**
   * Generate a unique session code
   */
  private generateUniqueCode(): string {
    let code: string;
    let attempts = 0;
    const maxAttempts = 100;

    do {
      code = generateSessionCode();
      attempts++;
      
      if (attempts >= maxAttempts) {
        throw new Error('Unable to generate unique session code');
      }
    } while (sessionsByCode.has(code));

    return code;
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    const expiredSessionIds: string[] = [];

    for (const [sessionId, session] of sessions.entries()) {
      if (isSessionExpired(session.expiresAt)) {
        expiredSessionIds.push(sessionId);
      }
    }

    expiredSessionIds.forEach(sessionId => {
      this.deleteSession(sessionId);
    });

    if (expiredSessionIds.length > 0) {
      console.info(`Cleaned up ${expiredSessionIds.length} expired sessions`);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, CLEANUP_INTERVAL);
  }

  /**
   * Stop cleanup timer (for testing/shutdown)
   */
  public stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clear all sessions (for testing)
   */
  public clearAllSessions(): void {
    sessions.clear();
    sessionsByCode.clear();
  }
}