import type { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`Error ${statusCode}: ${message}`, {
    url: req.url,
    method: req.method,
    stack: err.stack,
  });
  
  res.status(statusCode).json({
    error: message,
    code: err.code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};