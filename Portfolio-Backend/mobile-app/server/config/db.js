const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Windows Node.js querySrv ECONNREFUSED on MongoDB Atlas SRV connection strings
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore if not permitted
}

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('MONGODB_URI is not defined in .env');
      return;
    }
    const conn = await mongoose.connect(uri);
    console.log(`[Database] Connected to Real MongoDB Atlas: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[Database Error] ${error.message}`);
  }
};

module.exports = connectDB;
