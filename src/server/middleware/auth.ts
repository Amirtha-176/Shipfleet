import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../storage.ts';
import { IUser, UserRole } from '../types.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'fleetops_maritime_jwt_secret_token_key_2026';

export interface AuthRequest extends Request {
  user?: IUser;
}

export function generateToken(user: IUser): string {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: No token provided'
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: UserRole };
    const user = db.findById('users', decoded.id) as IUser | null;

    if (!user || user.status === 'disabled') {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User account not found or disabled'
      });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or expired token'
    });
  }
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required'
      });
      return;
    }

    const currentRole = req.user.role;
    // Allow 'user' to perform any task granted to 'user', 'operator', or 'viewer'
    const isAllowed =
      allowedRoles.includes(currentRole) ||
      (currentRole === 'user' && (allowedRoles.includes('operator') || allowedRoles.includes('viewer') || allowedRoles.includes('user')));

    if (!isAllowed) {
      res.status(403).json({
        success: false,
        message: `Forbidden: Access requires [${allowedRoles.join(', ')}] permissions`
      });
      return;
    }

    next();
  };
}

export function logAudit(req: AuthRequest, action: string, entity: string, entityId: string | undefined, description: string) {
  try {
    const user = req.user;
    db.create('auditLogs', {
      userId: user?._id || 'system',
      userName: user?.name || 'System Guest',
      userRole: user?.role || 'viewer',
      action,
      entity,
      entityId,
      description,
      ipAddress: req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Audit log write failed:', err);
  }
}
