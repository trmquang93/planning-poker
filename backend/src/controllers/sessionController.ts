import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { CreateSessionRequestSchema, JoinSessionRequestSchema } from '../shared/types';
import { SessionService } from '../services/sessionService';

export const sessionRouter = Router();
const sessionService = SessionService.getInstance();

// Health check endpoint
sessionRouter.get('/health', (req: Request, res: Response) => {
  res.json({ 
    message: 'Session API is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Create new session
sessionRouter.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = CreateSessionRequestSchema.parse(req.body);
    
    // Create session
    const result = sessionService.createSession(validatedData);
    
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Join existing session
sessionRouter.post('/join', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const validatedData = JoinSessionRequestSchema.parse(req.body);
    
    // Join session
    const result = sessionService.joinSession(validatedData);
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// Get session by ID
sessionRouter.get('/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const session = sessionService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ session });
  } catch (error) {
    next(error);
  }
});

// Get session by code
sessionRouter.get('/code/:code', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    const session = sessionService.getSessionByCode(code.toUpperCase());
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    res.json({ session });
  } catch (error) {
    next(error);
  }
});