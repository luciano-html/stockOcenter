import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { User, Component, ChairType, BOMItem, StockMovement } from './models';

const data = {
  "sillas": {
    "Rubi Alta": {
      "Respaldo interior": 110, "Respaldo exterior": 107, "Asiento interior": 90,
      "Asiento exterior": 87, "Contacto+ T/Flexor": 59, "Chapon/Chapas": 0,
      "Cilindro": 0, "Estrella": 0, "Ruedas": 0, "Fuelles": 0,
      "Leva neumatico": 0, "Leva redonda": 0
    },
    "Gema": {
      "Respaldo Negro": 0, "Respaldo Blanco": 0, "Respaldo Gris": 0,
      "Asiento interior": 0, "Estructura fija": 0, "Estructura fija con brazos": 0,
      "Canasto gas": 0, "Canasto con brazos": 0,
      "apoyabrazos Negros": 0, "apoyabrazos Blancos": 0, "Apoyabrazos Gris": 0
    },
    "Link": {
      "Respaldo": 0, "apoyabrazos": 0, "Asiento interior": 0, "Asiento exterior": 0,
      "chapon / basculante": 0, "Cilindro": 0, "Estrella": 0, "Ruedas": 0,
      "Fuelles": 0, "Leva neumatico": 0, "Visitor Negra": 0, "Visitor blanca": 0
    },
    "Cool": {
      "Tortuguita": 0, "Asiento exterior": 0, "Asiento Madera": 0, "Marco Red": 0,
      "Espuma inyectada asiento": 0, "Ruedas": 0, "Estrella": 0, "Cilindro": 0,
      "Cabezal": 2, "Fuelle": 0
    },
    "Wanda fija": {
      "Respaldo negro o blanco": 0, "Asiento interior": 0, "Asiento exterior": 0,
      "Estructura negra o cromada": 0
    },
    "Vita": {
      "Asiento interior": 0, "Asiento exterior": 0, "Marco Red": 0, "Marco Exterior": 0,
      "Red": 0, "Mecanismo Flexor": 0, "Flexor lumbar": 0, "Tortuguita": 0,
      "Cilindro": 0, "Estrella": 0, "Ruedas": 0, "Fuelles": 0
    },
    "Ema": {
      "Respaldo interior": 25, "Respaldo exterior": 22, "Insertos Respaldo exterior": 0,
      "Asiento interior": 0, "Asiento exterior": 0, "Flexor/Columna Fija": 0,
      "Cilindro": 0, "Estrella": 0, "Ruedas": 0, "Fuelles": 0,
      "Leva neumatico": 0, "Leva redonda": 0, "espuma asiento": 0, "espuma respaldo": 0
    },
    "Mint": {
      "Asiento Madera": 0, "Marco Red": 0, "Marco Exterior": 0, "Flexor lumbar": 0,
      "Estrella Alma": 0, "Apoya brazos mint": 0, "Espuma mint": 0
    },
    "Dina Alta": {
      "Tortuguita": 0, "Asiento exterior": 0, "Asiento Madera": 0, "Marco Red": 0,
      "Marco Exterior": 0, "Espuma inyectada asiento": 0, "Estrella alma": 0
    },
    "Grou": {
      "Tortuguita": 0, "Asiento exterior": 0, "Asiento Madera": 0, "Marco Red": 0,
      "Espuma inyectada asiento": 0, "Ruedas": 0, "Estrella": 0, "Cilindro": 0, "Fuelle": 0
    }
  },
  "componentes_generales": {
    "Estruc Luna fija": 10, "Estruc Luna fija c/br": 102, "Canasto Luna": 72,
    "Estruc Gala fija": 0, "Estruc Gala trineo pint": 0, "Estruc Gala trineo crom": 0,
    "Tandem 2 cuerpo": 1, "Tandem 3 cuerpos": 0, "Tandem 4 cuerpos": 0, "Tandem 5 cuerpos": 1,
    "Brazos Golf": 95, "Brazos Luna": 0, "Juego Brazos Gala": 8,
    "Brazos Alfa Pintados": 1, "Brazos Alfa Cromados": 46,
    "Juego Brazos Godi": 0, "Juego brazos Wanda": 0, "Aro pintado": 0, "Aro cromado": 0,
    "Vera Negro": 25, "Vera Azul": 0, "Vera Bordo": 25,
    "Novo Vera Negro": 110, "Novo Vera Azul": 40, "Novo Vera Blanco": 30, "Novo Vera Rojo": 30,
    "Asiento Int Luna": 80, "Asiento Ext Luna": 50,
    "Respaldo Int Luna": 48, "Respaldo Ext Luna": 30,
    "Asiento Int Gala": 90, "Asiento Ext Gala": 90,
    "Respaldo Int Gala": 80, "Respaldo Ext Gala": 60,
    "Estrella cober chica": 0, "Estrella cober grande": 22, "Estrella Arco": 21,
    "Estrella Alar": 0, "Estrella Alfa CROMADA": 90,
    "Fuelles": 1, "Ruedas": 1, "Cilindro normal": 0, "Cilindro Basculante": 35,
    "Mecanismo basculante": 1, "Caño Alargue 19 cm": 0, "Contacto Permanente": 0,
    "Espuma respaldo Luna": 65, "Espuma asiento Luna": 29,
    "Espuma respaldo RA": 46, "Espuma asiento Ruby": 38,
    "Espuma respaldo RB": 2, "Espuma asiento Link": 23,
    "Espuma respaldo Ema": 29, "Espuma asiento Ema NOVO": 34,
    "Espuma respaldo Gala": 15, "Espuma asiento Gala": 64,
    "Espuma respaldo Brisa": 21, "Espuma asiento Cool": 0,
    "Espuma respaldo Novo rubi": 25, "Espuma asiento Gema": 26
  }
};

// Marcas conocidas por silla
const marcasPorSilla: Record<string, string> = {
  "Link": "Rolic",
  "Cool": "Rolic",
  "Grou": "Rolic",
};

function inferirTipo(name: string): string {
  const n = name.toLowerCase();

  if (n.includes('espuma') || n.includes('espsuma')) return 'Espuma';

  if (n.includes('brazo') || n.includes('apoya')) return 'Brazo';

  if (n.includes('estruc') || n.includes('tandem') || n.includes('canasto')
    || n.includes('aro') || n.includes('caño')) return 'Estructura';

  if (n.includes('asiento') || n.includes('respaldo') || n.includes('vera')
    || n.includes('novo') || n.includes('cabezal')) return 'Tapizado';

  if (n.includes('estrella')) return 'Base';

  if (n.includes('rueda') || n.includes('fuelle') || n.includes('cilindro')
    || n.includes('mecanismo') || n.includes('contacto') || n.includes('leva')
    || n.includes('chapon') || n.includes('flexor') || n.includes('red')
    || n.includes('tortuguita')) return 'Mecanismo';

  if (n.includes('marco') || n.includes('inserto')) return 'Estructura';

  if (n.includes('visit')) return 'Tapizado';

  if (n.includes('chapon') || n.includes('basculante')) return 'Mecanismo';

  return 'General';
}

function parseValor(v: string | number | null): number {
  if (v === null) return 0;
  if (typeof v === 'number') return v;
  const lower = v.toLowerCase().trim();
  if (lower === 'hay' || lower === 'si' || lower === 'max' || lower === 'ny c') return 1;
  if (lower === '-' || lower === 'no') return 0;
  if (lower.endsWith('+')) return parseInt(v) || 0;
  return parseInt(v) || 0;
}

async function seed() {
  await connectDB();

  await Promise.all([
    User.deleteMany({}),
    Component.deleteMany({}),
    ChairType.deleteMany({}),
    BOMItem.deleteMany({}),
    StockMovement.deleteMany({}),
  ]);

  // Admin
  const hash = await bcrypt.hash('admin123', 10);
  await User.create({ username: 'admin', password: hash, name: 'Administrador', role: 'admin' });
  console.log('✓ Usuario admin (admin / admin123)');

  // Componentes generales
  const compMap = new Map<string, string>();

  for (const [name, valor] of Object.entries(data.componentes_generales)) {
    const cantidad = parseValor(valor);
    const tipo = inferirTipo(name);
    const comp = await Component.create({
      name, tipo, unit: 'unidad',
      stockActual: cantidad, stockMinimo: 1,
    });
    compMap.set(name, comp._id.toString());

    if (cantidad > 0) {
      await StockMovement.create({
        componentId: comp._id, type: 'ingreso', quantity: cantidad, notes: 'Stock inicial',
      });
    }
  }
  console.log(`✓ ${Object.keys(data.componentes_generales).length} componentes`);

  // Tipos de silla con BOM
  for (const [chairName, bom] of Object.entries(data.sillas)) {
    const chair = await ChairType.create({ name: chairName, active: true });
    const marca = marcasPorSilla[chairName];

    for (const [compName, qty] of Object.entries(bom)) {
      let compId = compMap.get(compName);
      if (!compId) {
        const tipo = inferirTipo(compName);
        const comp = await Component.create({ name: compName, tipo, ...(marca ? { marca } : {}), unit: 'unidad', stockActual: 0, stockMinimo: 1 });
        compId = comp._id.toString();
        compMap.set(compName, compId);
      }
      const cantidad = qty ?? 0;
      if (cantidad > 0) {
        await BOMItem.create({ chairTypeId: chair._id, componentId: compId, quantity: cantidad });
      } else if (cantidad === 0) {
        await BOMItem.create({ chairTypeId: chair._id, componentId: compId, quantity: 1 });
      }
    }
  }
  console.log(`✓ ${Object.keys(data.sillas).length} tipos de silla con BOM`);

  // Asignar marca Rolic a componentes de sillas Link/Cool/Grou en la BOM
  for (const chairName of ['Link', 'Cool', 'Grou']) {
    const chair = await ChairType.findOne({ name: chairName });
    if (!chair) continue;
    const bomItems = await BOMItem.find({ chairTypeId: chair._id }).populate('componentId');
    for (const item of bomItems) {
      const comp = item.componentId as unknown as { _id: string; marca?: string };
      if (!comp.marca) {
        await Component.findByIdAndUpdate(comp._id, { marca: 'Rolic' });
      }
    }
  }
  console.log('✓ Marcas Rolic asignadas a componentes de Link, Cool, Grou');

  console.log('\n✅ Seed completo');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
