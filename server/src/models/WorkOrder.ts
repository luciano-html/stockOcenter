import mongoose, { Schema, Document, Types } from 'mongoose';

export type WorkOrderStatus = 'pendiente' | 'en_progreso' | 'pausada' | 'finalizada' | 'cancelada';

export interface IWorkOrderItem {
  componentId: Types.ObjectId;
  quantity: number;
  type: 'adicional' | 'repuesto';
}

export interface IWorkOrder extends Document {
  chairTypeId?: Types.ObjectId;
  quantity: number;
  status: WorkOrderStatus;
  items?: IWorkOrderItem[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  startedBy?: Types.ObjectId;
  startedAt?: Date;
  finalizedBy?: Types.ObjectId;
  operatorNotes?: string;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
}

const workOrderItemSchema = new Schema<IWorkOrderItem>(
  {
    componentId: { type: Schema.Types.ObjectId, ref: 'Component', required: true },
    quantity: { type: Number, required: true, min: 1 },
    type: { type: String, required: true, enum: ['adicional', 'repuesto'] },
  },
  { _id: false }
);

const workOrderSchema = new Schema<IWorkOrder>(
  {
    chairTypeId: { type: Schema.Types.ObjectId, ref: 'ChairType', required: false, index: true },
    quantity: { type: Number, required: true, min: 1 },
    items: { type: [workOrderItemSchema] },
    status: {
      type: String,
      required: true,
      enum: ['pendiente', 'en_progreso', 'pausada', 'finalizada', 'cancelada'],
      default: 'pendiente',
      index: true,
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    startedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    startedAt: { type: Date },
    finalizedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    operatorNotes: { type: String, trim: true },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

workOrderSchema.index({ status: 1, createdAt: -1 });

export const WorkOrder = mongoose.model<IWorkOrder>('WorkOrder', workOrderSchema);
