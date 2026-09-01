const mongoose = require('mongoose');

const Schema = mongoose.Schema;
const stockTransactionSchema = new Schema({}, { strict: false, collection: 'stocktransactions' });
const WorkOrderSchema = new Schema({}, { strict: false, collection: 'workorders' });

const StockTransaction = mongoose.model('StockTransaction', stockTransactionSchema);
mongoose.model('WorkOrder', WorkOrderSchema);

async function run() {
  await mongoose.connect('mongodb://localhost:27017/stock-office');
  try {
    const movimientos = await StockTransaction.find({})
      .populate('items.componentId', 'name unit tipo subtipo marca')
      .populate('userId', 'name role')
      .populate({
        path: 'referenceId',
        model: 'WorkOrder',
        select: 'sillas chairTypeId quantity items',
        populate: [
          { path: 'sillas.chairTypeId', select: 'name' },
          { path: 'chairTypeId', select: 'name' },
        ],
      })
      .sort({ createdAt: -1 })
      .skip(0)
      .limit(20)
      .lean();
    console.log('SUCCESS:', movimientos.length);
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
