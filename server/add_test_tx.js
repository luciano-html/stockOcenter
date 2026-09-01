const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const stockTransactionSchema = new Schema({}, { strict: false, collection: 'stocktransactions' });
const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);

async function run() {
  await mongoose.connect('mongodb://localhost:27017/stock-office');
  try {
    await StockTransaction.create({
      type: 'ingreso',
      items: [{ componentId: new mongoose.Types.ObjectId(), quantity: 5 }],
      createdAt: new Date()
    });
    console.log('Test transaction added');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
