const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/stock-office');
  try {
    const db = mongoose.connection.db;
    if (!db) return;
    await db.collection('stockmovements').drop().catch(() => console.log('stockmovements not found'));
    await db.collection('stocktransactions').drop().catch(() => console.log('stocktransactions not found'));
    console.log('Collections dropped successfully');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await mongoose.disconnect();
  }
}
run();
