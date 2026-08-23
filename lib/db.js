import mongoose from 'mongoose';

const MONGO_URI = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();
const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/ca-document-system';

if (!MONGO_URI) {
  console.warn('⚠️ MONGO_URI or MONGODB_URI environment variable is not defined! System will fall back to local MongoDB.');
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 2000,
    };

    cached.promise = mongoose.connect(MONGO_URI, opts)
      .then((mongooseInstance) => {
        console.log('✅ Next.js connected to MongoDB Atlas');
        return mongooseInstance;
      })
      .catch(async (err) => {
        console.warn('⚠️ MongoDB Atlas connection failed (network/IP whitelist). Falling back to local MongoDB...', err.message);
        return mongoose.connect(LOCAL_MONGO_URI, { bufferCommands: false, serverSelectionTimeoutMS: 2000 })
          .then((localInstance) => {
            console.log('✅ Next.js connected to Local MongoDB Failover (127.0.0.1:27017)');
            return localInstance;
          });
      });
  }

  try {
    cached.conn = await cached.promise;
    if (mongoose.connection && mongoose.connection.db) {
      mongoose.connection.db.collection('usersessions').dropIndex('phoneNumber_1').catch(() => {});
    }
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
