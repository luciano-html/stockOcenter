import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Component } from '../models';

const MAP: Record<string, 'Giratoria' | 'Fija' | 'Ambas'> = {
  Rueda: 'Giratoria',
  Estrella: 'Giratoria',
  Cilindro: 'Giratoria',
  Chapon: 'Giratoria',
  Fuelle: 'Giratoria',
  Mecanismo: 'Giratoria',
  Contacto: 'Giratoria',
  Tornilleria: 'Giratoria',
  Apoyabrazo: 'Giratoria',
  Apoyacabezas: 'Giratoria',
  Respaldos: 'Giratoria',
  interior: 'Giratoria',
  Espuma: 'Ambas',
  Tapizado: 'Ambas',
  Asiento: 'Ambas',
  Estructura: 'Ambas',
  Respaldo: 'Ambas',
};

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  const componentes = await Component.find({});
  let updated = 0;
  let skipped = 0;

  for (const c of componentes) {
    const categoria = MAP[c.tipo] ?? 'Ambas';
    if (!c.tipoSilla || c.tipoSilla !== categoria) {
      await Component.updateOne({ _id: c._id }, { $set: { tipoSilla: categoria } });
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`Componentes procesados: ${componentes.length} (actualizados: ${updated}, ya ok: ${skipped})`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
