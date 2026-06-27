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
    chairTypeId: { type: Schema.Types.ObjectId, ref: 'ChairType', required: false },
    quantity: { type: Number, required: true, min: 1 },
    items: { type: [workOrderItemSchema] },
    status: {
      type: String,
      required: true,
      enum: ['pendiente', 'en_progreso', 'pausada', 'finalizada', 'cancelada'],
      default: 'pendiente',
    },
    finalizedAt: { type: Date },
  },
  { timestamps: true }
);

export const WorkOrder = mongoose.model<IWorkOrder>('WorkOrder', workOrderSchema);
