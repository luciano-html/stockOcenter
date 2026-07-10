import { Request } from 'express';
import { AuditLog, IAuditLog, AuditAction, AuditSeverity } from '../models';

interface CreateAuditLogInput {
  action: AuditAction;
  severity?: AuditSeverity;
  userId?: string | import('mongoose').Types.ObjectId;
  userRole?: 'admin' | 'operario';
  username?: string;
  description: string;
  metadata?: Record<string, unknown>;
  req?: Request;
}

export async function createAuditLog(input: CreateAuditLogInput): Promise<IAuditLog> {
  const log = await AuditLog.create({
    action: input.action,
    severity: input.severity ?? 'info',
    userId: input.userId,
    userRole: input.userRole,
    username: input.username,
    description: input.description,
    metadata: input.metadata ?? {},
    ip: input.req?.ip,
    userAgent: input.req?.headers['user-agent'],
  });
  return log;
}

export function getClientInfo(req: Request) {
  return {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };
}
