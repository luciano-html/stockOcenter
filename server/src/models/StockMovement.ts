import mongoose, { Schema, Document, Types } from 'mongoose';

export type MovementType = 'ingreso' | 'egreso';

export interface IStockMovement extends Document {
  componentId: Types.ObjectId;
  type: MovementType;
  quantity: number;
  referenceType?: 'work-order';
  referenceId?: Types.ObjectId;
  notes?: string;
  createdAt: Date;
}

const stockMovementSchema = new Schema<IStockMovement>(
  {
    componentId: { type: Schema.Types.ObjectId, ref: 'Component', required: true, index: true },
    type: { type: String, required: true, enum: ['ingreso', 'egreso'] },
    quantity: { type: Number, required: true, min: 1 },
    referenceType: { type: String, enum: ['work-order'] },
    referenceId: { type: Schema.Types.ObjectId },
    notes: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockMovementSchema.index({ createdAt: -1 });

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', stockMovementSchema);
