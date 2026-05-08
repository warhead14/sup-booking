import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const password = req.headers['x-admin-password'];
  
  if (!password || password !== config.adminPassword) {
    return res.status(401).json({ error: 'Unauthorized: Invalid admin password' });
  }
  
  next();
};
