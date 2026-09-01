import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILiveOrder extends Document {
  items: Types.ObjectId[];
  total: number;
  customer: string;
  status: 'completada' | 'cancelada';
  createdAt: Date;
  updatedAt: Date;
}

const liveOrderSchema = new Schema<ILiveOrder>(
  {
    items: [{ type: Schema.Types.ObjectId, ref: 'ChairType', required: true }],
    total: { type: Number, required: true, default: 0 },
    customer: { type: String, required: true, trim: true },
    status: {
      type: String,
      required: true,
      enum: ['completada', 'cancelada'],
      default: 'completada',
    },
  },
  { timestamps: true }
);

export const LiveOrder = mongoose.model<ILiveOrder>('LiveOrder', liveOrderSchema);
