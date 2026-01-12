import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, AppRole } from '../types/index.js';

export const requireAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

export const requireRole = (...roles: AppRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!roles.includes(req.session.role as AppRole)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
};

export const requireSupervisorOrAbove = requireRole(
  'supervisor',
  'operations_head',
  'admin',
  'super_admin'
);

export const requireAdmin = requireRole('admin', 'super_admin');
