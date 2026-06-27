import mongoose, { Schema, Document } from 'mongoose';

export interface IComponent extends Document {
  name: string;
  description?: string;
  tipo: string;
  subtipo?: string;
  marca?: string;
  unit: string;
  stockActual: number;
  stockReservado: number;
  stockMinimo: number;
  createdAt: Date;
  updatedAt: Date;
}

const componentSchema = new Schema<IComponent>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true },
    tipo: { type: String, required: true, trim: true, index: true },
    subtipo: { type: String, trim: true, index: true },
    marca: { type: String, trim: true, index: true },
    unit: { type: String, required: true, trim: true },
    stockActual: { type: Number, required: true, default: 0, min: 0 },
    stockReservado: { type: Number, required: true, default: 0, min: 0 },
    stockMinimo: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

componentSchema.virtual('stockDisponible').get(function () {
  return this.stockActual - this.stockReservado;
});

componentSchema.set('toJSON', { virtuals: true });
componentSchema.set('toObject', { virtuals: true });

export const Component = mongoose.model<IComponent>('Component', componentSchema);
