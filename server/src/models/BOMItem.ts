import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBOMItem extends Document {
  chairTypeId: Types.ObjectId;
  componentId: Types.ObjectId;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
}

const bomItemSchema = new Schema<IBOMItem>(
  {
    chairTypeId: { type: Schema.Types.ObjectId, ref: 'ChairType', required: true },
    componentId: { type: Schema.Types.ObjectId, ref: 'Component', required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

bomItemSchema.index({ chairTypeId: 1, componentId: 1 }, { unique: true });
bomItemSchema.index({ componentId: 1 });

export const BOMItem = mongoose.model<IBOMItem>('BOMItem', bomItemSchema);
