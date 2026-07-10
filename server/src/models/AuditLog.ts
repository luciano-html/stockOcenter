import mongoose, { Schema, Document, Types } from 'mongoose';

export type AuditAction =
  // auth / users
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'user_created'
  | 'user_deleted'
  | 'profile_updated'
  // stock
  | 'stock_ingreso'
  | 'stock_ingreso_masivo'
  | 'stock_egreso'
  // components
  | 'component_created'
  | 'component_updated'
  | 'component_deleted'
  // chair types
  | 'chair_type_created'
  | 'chair_type_updated'
  | 'chair_type_deleted'
  // work orders
  | 'work_order_created'
  | 'work_order_updated'
  | 'work_order_status_changed'
  | 'work_order_finished';

export type AuditSeverity = 'info' | 'warning' | 'error';

export interface IAuditLog extends Document {
  action: AuditAction;
  severity: AuditSeverity;
  userId?: Types.ObjectId;
  userRole?: 'admin' | 'operario';
  username?: string;
  description: string;
  metadata: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    severity: { type: String, required: true, enum: ['info', 'warning', 'error'], default: 'info' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userRole: { type: String, enum: ['admin', 'operario'] },
    username: { type: String },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String },
    userAgent: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Índices para consultas comunes de logs
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });

// TTL: 6 meses para todos los logs
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * 180 }
);

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
