const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Automatically check and drop the legacy unique index on serialNo if it exists
    try {
      const db = conn.connection.db;
      const collection = db.collection('bookings');
      const indexes = await collection.indexes();
      const hasSerialIndex = indexes.some(idx => idx.name === 'serialNo_1');
      if (hasSerialIndex) {
        console.log('[Database] Legacy unique index serialNo_1 detected. Dropping index...');
        await collection.dropIndex('serialNo_1');
        console.log('[Database] Legacy unique index serialNo_1 dropped successfully.');
      }
    } catch (indexErr) {
      console.warn(`[Database] Warning checking/dropping unique index: ${indexErr.message}`);
    }
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
