import { Request } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger';

export interface AuditLogPayload {
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  success: boolean;
  errorCode?: string;
  metadata?: any;
}

export const logAudit = (req: Request, payload: Omit<AuditLogPayload, 'userId'> & { userId?: string }) => {
  try {
    const userId = payload.userId || (req as any).user?.id || 'system';
    
    // Hash IP with daily salt to comply with SECURITY.md §3.3
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const dailySalt = new Date().toISOString().split('T')[0] + (process.env.JWT_SECRET || 'lmls_secret');
    const ipHash = crypto.createHash('sha256').update(ip + dailySalt).digest('hex');

    const auditLogEntry = {
      timestamp: new Date().toISOString(),
      userId,
      action: payload.action,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      ipHash,
      userAgent: req.headers['user-agent'] || 'unknown',
      success: payload.success,
      errorCode: payload.errorCode,
      metadata: payload.metadata || {},
    };

    // Log structured JSON
    logger.info('AUDIT_LOG', auditLogEntry);
  } catch (error) {
    logger.error('Failed to log audit event', error);
  }
};
