
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Component = mongoose.model('Component', new mongoose.Schema({ stock: Number, reserved: Number }, { strict: false }));
const WorkOrder = mongoose.model('WorkOrder', new mongoose.Schema({}, { strict: false }));
const StockTransaction = mongoose.model('StockTransaction', new mongoose.Schema({ items: Array, type: String }, { strict: false }));
const DeliveryRoute = mongoose.model('DeliveryRoute', new mongoose.Schema({}, { strict: false }));

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/stock-office-center');
  console.log('Connected to local DB');
  
  const txs = await StockTransaction.find({ referenceType: 'work-order' }).lean();
  console.log('Found ' + txs.length + ' order-related transactions');
  
  for (const tx of txs) {
    const isEgreso = tx.type === 'consumo_orden' || tx.type === 'egreso';
    for (const item of tx.items) {
      if (isEgreso) {
        await Component.updateOne({ _id: item.componentId }, { $inc: { stock: item.quantity } });
      } else {
        await Component.updateOne({ _id: item.componentId }, { $inc: { stock: -item.quantity } });
      }
    }
  }
  
  await Component.updateMany({}, { $set: { reserved: 0 } });
  await StockTransaction.deleteMany({ referenceType: 'work-order' });
  await WorkOrder.deleteMany({});
  await DeliveryRoute.deleteMany({});
  
  console.log('Local DB cleaned successfully');
  process.exit(0);
}

run().catch(console.error);
