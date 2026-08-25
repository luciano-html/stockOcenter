import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Component } from '../models';

// "Respaldos" era un typo histórico de la categoría "Respaldo".
// El componente "Respaldo Link Lumbar" se renombra a la categoría canónica
// "Respaldo" y conserva tipoSilla 'Giratoria' (solo se usa en sillas giratorias).
async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  const result = await Component.updateMany(
    { tipo: 'Respaldos' },
    { $set: { tipo: 'Respaldo', tipoSilla: 'Giratoria' } }
  );

  console.log(`Categorías 'Respaldos' renombradas a 'Respaldo': ${result.modifiedCount}`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});