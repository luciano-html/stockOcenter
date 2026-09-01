import mongoose, { Schema, Document } from 'mongoose';

export type CondicionIva = 'Responsable Inscripto' | 'Consumidor Final' | 'Monotributo' | 'Exento';

export interface ICustomer extends Document {
  name: string;
  razonSocial?: string;
  cuit?: string;
  condicionIva: CondicionIva;
  email?: string;
  telefono?: string;
  contacto?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  notas?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true, index: true },
    razonSocial: { type: String, trim: true },
    cuit: { type: String, trim: true, index: true },
    condicionIva: {
      type: String,
      required: true,
      enum: ['Responsable Inscripto', 'Consumidor Final', 'Monotributo', 'Exento'],
      default: 'Consumidor Final',
    },
    email: { type: String, trim: true, lowercase: true },
    telefono: { type: String, trim: true },
    contacto: { type: String, trim: true },
    direccion: { type: String, trim: true },
    localidad: { type: String, trim: true, default: 'Santa Fe' },
    provincia: { type: String, trim: true, default: 'Santa Fe' },
    notas: { type: String, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

customerSchema.index({ name: 'text', razonSocial: 'text', cuit: 'text', telefono: 'text', email: 'text' });

export const Customer = mongoose.model<ICustomer>('Customer', customerSchema);
