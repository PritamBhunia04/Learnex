const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/Learnex';
    const normalizedUri = uri.replace(/\/+$/, '');
    mongoose.set('strictQuery', true);
    await mongoose.connect(normalizedUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    throw err;
  }
};

module.exports = {
  mongoose,
  connectDB
};
