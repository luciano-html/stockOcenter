import mongoose, { Schema, Document, Types } from 'mongoose';

export type WorkOrderStatus = 'pendiente' | 'en_progreso' | 'pausada' | 'finalizada' | 'cancelada';

export interface IWorkOrder extends Document {
  chairTypeId: Types.ObjectId;
  quantity: number;
  status: WorkOrderStatus;
  createdAt: Date;
  updatedAt: Date;
  finalizedAt?: Date;
}

const workOrderSchema = new Schema<IWorkOrder>(
  {
    chairTypeId: { type: Schema.Types.ObjectId, ref: 'ChairType', required: true },
    quantity: { type: Number, required: true, min: 1 },
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
