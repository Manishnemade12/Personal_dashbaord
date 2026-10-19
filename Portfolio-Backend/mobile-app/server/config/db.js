const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Windows Node.js querySrv ECONNREFUSED on MongoDB Atlas SRV connection strings
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {
  // Ignore if not permitted
}

let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not defined in environment variables');
    throw new Error('MONGODB_URI is not defined');
  }

  if (!cached.promise) {
    const opts = {
      serverSelectionTimeoutMS: 8000,
    };
    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log(`[Database] Connected to Real MongoDB Atlas: ${m.connection.host}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error(`[Database Error] ${error.message}`);
    throw error;
  }

  return cached.conn;
};

module.exports = connectDB;
