const mongoose = require('mongoose');
const { Schema } = mongoose;
const workOrderSchema = new Schema({}, { strict: false, collection: 'workorders' });
const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

async function run() {
  await mongoose.connect('mongodb://localhost:27017/stock-office-center');
  const match = { status: 'finalizada' };
  
  const rankingAggr = await WorkOrder.aggregate([
      { $match: match },
      {
        $project: {
          sillas: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ['$sillas', []] } }, 0] },
              then: '$sillas',
              else: [
                {
                  chairTypeId: '$chairTypeId',
                  quantity: '$quantity',
                }
              ]
            }
          }
        }
      },
      { $unwind: '$sillas' },
      { $match: { 'sillas.chairTypeId': { $ne: null } } },
      {
        $group: {
          _id: { $toObjectId: '$sillas.chairTypeId' },
          totalProducidas: { $sum: '$sillas.quantity' }
        }
      }
    ]);
  console.log('RANKING:', rankingAggr);
  process.exit(0);
}
run();
