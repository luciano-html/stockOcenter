const mongoose = require('mongoose');
const { Schema } = mongoose;
const workOrderSchema = new Schema({}, { strict: false, collection: 'workorders' });
const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

async function run() {
  await mongoose.connect('mongodb://localhost:27017/stock-office-center');
  const match = { status: 'finalizada' };
  
  const year = 2026;
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year + 1, 0, 1);
  match.createdAt = { $gte: startDate, $lt: endDate };
  
  console.log('Match filter:', match);
  const count = await WorkOrder.countDocuments(match);
  console.log('Count:', count);
  
  const aggr = await WorkOrder.aggregate([{ $match: match }]);
  console.log('Aggr count:', aggr.length);
  if (aggr.length > 0) console.log('Sample created at:', aggr[0].createdAt);
  
  process.exit(0);
}
run();
