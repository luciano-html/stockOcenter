import mongoose, { Schema, Document } from 'mongoose';

export interface IChairType extends Document {
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const chairTypeSchema = new Schema<IChairType>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    active: { type: Boolean, required: true, default: true },
  },
  { timestamps: true }
);

export const ChairType = mongoose.model<IChairType>('ChairType', chairTypeSchema);
