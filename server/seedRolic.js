const mongoose = require('mongoose');
require('dotenv').config();

const componentSchema = new mongoose.Schema({
  name: String,
  tipo: String,
  subtipo: String,
  marca: String,
  unit: String,
  stockMinimo: Number,
  precio: Number,
  tipoSilla: String,
}, { timestamps: true });

const Component = mongoose.models.Component || mongoose.model('Component', componentSchema);

const chairTypeSchema = new mongoose.Schema({
  name: String,
  tipo: String,
  description: String,
  precioVenta: Number,
  active: Boolean,
}, { timestamps: true });

const ChairType = mongoose.models.ChairType || mongoose.model('ChairType', chairTypeSchema);

const bomItemSchema = new mongoose.Schema({
  chairTypeId: mongoose.Schema.Types.ObjectId,
  componentId: mongoose.Schema.Types.ObjectId,
  quantity: Number,
});

const BOMItem = mongoose.models.BOMItem || mongoose.model('BOMItem', bomItemSchema);

const rolicComponents = [
  { name: 'Estrella Nylon Base Alta', tipo: 'Estrella', subtipo: 'Nylon', marca: 'Rolic', unit: 'unidad', stockMinimo: 10, precio: 35000, tipoSilla: 'Giratoria' },
  { name: 'Ruedas 50mm PU', tipo: 'Rueda', subtipo: '50mm', marca: 'Rolic', unit: 'unidad', stockMinimo: 50, precio: 3000, tipoSilla: 'Giratoria' },
  { name: 'Cilindro Gas Neumático Clase 3', tipo: 'Cilindro', subtipo: 'Neumático', marca: 'Rolic', unit: 'unidad', stockMinimo: 10, precio: 25000, tipoSilla: 'Giratoria' },
  { name: 'Mecanismo Syncro Multiposición', tipo: 'Mecanismo', subtipo: 'Syncro', marca: 'Rolic', unit: 'unidad', stockMinimo: 10, precio: 45000, tipoSilla: 'Giratoria' },
  { name: 'Asiento Espuma Inyectada Gris', tipo: 'Asiento', subtipo: 'Tapizado', marca: 'Rolic', unit: 'unidad', stockMinimo: 10, precio: 35000, tipoSilla: 'Ambas' },
  { name: 'Respaldo Mesh Ergonómico', tipo: 'Respaldo', subtipo: 'Mesh', marca: 'Rolic', unit: 'unidad', stockMinimo: 10, precio: 40000, tipoSilla: 'Ambas' },
  { name: 'Apoyabrazos Regulables 2D', tipo: 'Apoyabrazo', subtipo: 'Regulable', marca: 'Rolic', unit: 'par', stockMinimo: 10, precio: 25000, tipoSilla: 'Ambas' },
  { name: 'Apoyacabezas Mesh', tipo: 'Apoyacabezas', subtipo: 'Mesh', marca: 'Rolic', unit: 'unidad', stockMinimo: 10, precio: 15000, tipoSilla: 'Ambas' },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stockocenter');
    console.log('Connected to DB');

    let chair = await ChairType.findOne({ name: 'Silla Rolic Cool' });
    if (!chair) {
      chair = await ChairType.create({
        name: 'Silla Rolic Cool',
        tipo: 'Giratoria',
        description: 'Silla ergonómica gamer con tapizado mesh y mecanismo syncro.',
        precioVenta: 439990,
        active: true,
      });
      console.log('Created ChairType: Silla Rolic Cool');
    } else {
      chair.precioVenta = 439990;
      await chair.save();
      console.log('Updated ChairType: Silla Rolic Cool');
    }

    const bomEntries = [];

    for (const compData of rolicComponents) {
      let comp = await Component.findOne({ name: compData.name });
      if (!comp) {
        comp = await Component.create(compData);
        console.log(`Created component: ${comp.name}`);
      } else {
        comp.precio = compData.precio;
        await comp.save();
      }

      let quantity = 1;
      if (comp.name.includes('Ruedas')) quantity = 5;

      const existingBom = await BOMItem.findOne({ chairTypeId: chair._id, componentId: comp._id });
      if (!existingBom) {
        await BOMItem.create({ chairTypeId: chair._id, componentId: comp._id, quantity });
      } else {
        existingBom.quantity = quantity;
        await existingBom.save();
      }
    }

    console.log('Successfully seeded Rolic Cool components and BOM.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

seed();
