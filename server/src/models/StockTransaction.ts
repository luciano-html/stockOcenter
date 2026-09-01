import mongoose, { Schema, Document, Types } from 'mongoose';

export type TransactionType = 'ingreso' | 'egreso' | 'ingreso_masivo' | 'consumo_orden' | 'ajuste';

export interface ITransactionItem {
  componentId: Types.ObjectId;
  quantity: number;
  notes?: string;
}

export interface IStockTransaction extends Document {
  type: TransactionType;
  items: ITransactionItem[];
  referenceType?: 'work-order';
  referenceId?: Types.ObjectId;
  notes?: string;
  userId?: Types.ObjectId;
  userRole?: 'admin' | 'operario';
  createdAt: Date;
}

const transactionItemSchema = new Schema<ITransactionItem>(
  {
    componentId: { type: Schema.Types.ObjectId, ref: 'Component', required: true },
    quantity: { type: Number, required: true, min: 1 },
    notes: { type: String, trim: true },
  },
  { _id: false }
);

const stockTransactionSchema = new Schema<IStockTransaction>(
  {
    type: {
      type: String,
      required: true,
      enum: ['ingreso', 'egreso', 'ingreso_masivo', 'consumo_orden', 'ajuste'],
    },
    items: { type: [transactionItemSchema], required: true },
    referenceType: { type: String, enum: ['work-order'] },
    referenceId: { type: Schema.Types.ObjectId, ref: 'WorkOrder' },
    notes: { type: String, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    userRole: { type: String, enum: ['admin', 'operario'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

stockTransactionSchema.index({ createdAt: -1 });
stockTransactionSchema.index({ 'items.componentId': 1 });
stockTransactionSchema.index({ type: 1 });

export const StockTransaction = mongoose.model<IStockTransaction>('StockTransaction', stockTransactionSchema);
