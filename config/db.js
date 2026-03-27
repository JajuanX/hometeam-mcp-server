import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error('MONGO_URI is not configured for the MCP server');
  }

  try {
    await mongoose.connect(mongoUri);
    console.error('MCP MongoDB connected');
  } catch (error) {
    console.error('MCP MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

export default connectDB;
