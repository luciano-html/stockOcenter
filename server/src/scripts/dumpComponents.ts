import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Component } from '../models';

async function main() {
  await mongoose.connect(process.env.MONGODB_URI as string);

  const components = await Component.find({}).sort({ tipo: 1, name: 1 }).lean();
  console.log(`TOTAL COMPONENTES: ${components.length}`);
  const grouped: Record<string, any[]> = {};
  for (const c of components) {
    if (!grouped[c.tipo]) grouped[c.tipo] = [];
    grouped[c.tipo].push(c);
  }

  for (const [tipo, list] of Object.entries(grouped)) {
    console.log(`\n=== ${tipo.toUpperCase()} (${list.length}) ===`);
    for (const c of list) {
      console.log(`- ${c.name} | Subtipo: ${c.subtipo || ''} | Marca: ${c.marca || ''} | Precio Actual: $${c.precio}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(console.error);
