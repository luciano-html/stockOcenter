import mongoose, { Schema, Document } from 'mongoose';

export interface ICostoPersonalizado {
  _id?: string;
  nombre: string;
  tipo: 'porcentaje' | 'fijo';
  valor: number;
}

export interface IPricingConfig extends Document {
  key: string;
  manoDeObra: number;
  iva: number;
  gastosGenerales: number;
  comisiones: number;
  margenGanancia: number;
  porcentajeAdicional: number;
  costosPersonalizados: ICostoPersonalizado[];
  createdAt: Date;
  updatedAt: Date;
}

const costoPersonalizadoSchema = new Schema({
  nombre: { type: String, required: true, trim: true },
  tipo: { type: String, enum: ['porcentaje', 'fijo'], required: true, default: 'porcentaje' },
  valor: { type: Number, required: true, default: 0, min: 0 },
});

const pricingConfigSchema = new Schema<IPricingConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    manoDeObra: { type: Number, required: true, default: 25000, min: 0 },
    iva: { type: Number, required: true, default: 21, min: 0 },
    gastosGenerales: { type: Number, required: true, default: 5, min: 0 },
    comisiones: { type: Number, required: true, default: 10, min: 0 },
    margenGanancia: { type: Number, required: true, default: 35, min: 0 },
    porcentajeAdicional: { type: Number, required: true, default: 0, min: 0 },
    costosPersonalizados: { type: [costoPersonalizadoSchema], default: [] },
  },
  { timestamps: true }
);

export const PricingConfig = mongoose.model<IPricingConfig>('PricingConfig', pricingConfigSchema);

