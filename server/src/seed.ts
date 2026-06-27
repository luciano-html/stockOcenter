import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { User, Component, ChairType, BOMItem, StockMovement } from './models';

const data = {
  "sillas": {
    "Rubi Alta": { "Respaldo interior": 110, "Respaldo exterior": 107, "Asiento interior": 90, "Asiento exterior": 87, "Contacto+ T/Flexor": 59 },
    "Gema": {},
    "Link": {},
    "Cool": { "Cabezal": 2 },
    "Wanda fija": {},
    "Vita": {},
    "Ema": { "Respaldo interior": 25, "Respaldo exterior": 22 },
    "Mint": {},
    "Dina Alta": {},
    "Grou": {}
  },
  "Componentes Generales": {
    "Estruc Luna fija": 10, "Estruc Luna fija c/br": 102, "Canasto Luna": 73,
    "Tandem 2 cuerpo": 1, "Tandem 5 cuerpos": 1, "Brazos Golf": 5,
    "Brazos Luna": 8, "Juego Brazos Gala": 8, "Brazos Alfa Pintados": 0,
    "Brazos Alfa Cromados": 46, "Vera Negro": 25, "Vera Bordó": 25,
    "Novo Vera Negro": 110, "Novo Vera Azul": 40, "Novo Vera Blanco": 30,
    "Novo Vera Rojo": 30, "Asiento Int Luna": 80, "Asiento Ext Luna": 50,
    "Respaldo Int Luna": 48, "Respaldo Ext Luna": 50, "Asiento Int Gala": 90,
    "Asiento Ext Gala": 90, "Respaldo Int Gala": 80, "Respaldo Ext Gala": 60,
    "Estrella cober grande": 22, "Estrella Arco": 21, "Estrella Alar": 0,
    "Estrella Alfa CROMADA": 10, "Fuelles": 0, "Ruedas": 0,
    "Cilindro normal": 0, "Cilindro Basculante": 35,
    "Mecanismo basculante": 0,
    "Espsuma respaldo Luna": 65, "Espsuma asiento Luna": 29,
    "Espsuma respaldo RA": 46, "Espsuma asiento Ruby": 38,
    "Espsuma respaldo RB": 2, "Espuma asiento Link": 23,
    "Espsuma respaldo Ema": 29, "Espuma asiento Ema Novo": 34,
    "Espsuma respaldo Gala": 15, "Espuma asiento Gala": 64,
    "Espsuma respaldo Brisa": 21, "Espuma respaldo Novo rubi": 25,
    "Espuma asiento Gema": 26
  }
};

function parseValor(v: string | number): number {
  if (typeof v === 'number') return v;
  const lower = v.toLowerCase();
  if (lower === 'hay' || lower === 'si') return 1;
  if (lower === '-' || lower === 'no') return 0;
  if (lower.endsWith('+')) return parseInt(v) || 0;
  return parseInt(v) || 0;
}

async function seed() {
  await connectDB();

  // Limpiar datos existentes
  await Promise.all([
    User.deleteMany({}),
    Component.deleteMany({}),
    ChairType.deleteMany({}),
    BOMItem.deleteMany({}),
    StockMovement.deleteMany({}),
  ]);

  // 1. Crear admin
  const hash = await bcrypt.hash('admin123', 10);
  await User.create({ username: 'admin', password: hash, name: 'Administrador', role: 'admin' });
  console.log('✓ Usuario admin creado (admin / admin123)');

  // 2. Crear componentes generales
  const compMap = new Map<string, string>();
  const generales = data["Componentes Generales"] as Record<string, string | number>;
  for (const [name, valor] of Object.entries(generales)) {
    const cantidad = parseValor(valor);
    const comp = await Component.create({
      name,
      tipo: 'General',
      marca: 'General',
      unit: 'unidad',
      stockActual: cantidad,
      stockMinimo: 1,
    });
    compMap.set(name, comp._id.toString());
    if (cantidad > 0) {
      await StockMovement.create({
        componentId: comp._id,
        type: 'ingreso',
        quantity: cantidad,
        notes: 'Stock inicial',
      });
    }
  }
  console.log(`✓ ${Object.keys(generales).length} componentes creados`);

  // 3. Crear tipos de silla con sus BOM
  for (const [chairName, bom] of Object.entries(data.sillas)) {
    const chair = await ChairType.create({ name: chairName, active: true });
    console.log(`  ✓ Tipo de silla: ${chairName}`);

    for (const [compName, qty] of Object.entries(bom)) {
      let compId = compMap.get(compName);
      if (!compId) {
        const comp = await Component.create({
          name: compName,
          tipo: 'Tapizado',
          marca: 'General',
          unit: 'unidad',
          stockActual: 0,
          stockMinimo: 1,
        });
        compId = comp._id.toString();
        compMap.set(compName, compId);
        console.log(`    + Componente creado desde BOM: ${compName}`);
      }
      await BOMItem.create({ chairTypeId: chair._id, componentId: compId, quantity: qty });
    }
  }
  console.log(`✓ ${Object.keys(data.sillas).length} tipos de silla con BOM creados`);

  console.log('\n✅ Seed completo');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error en seed:', err);
  process.exit(1);
});
