import mongoose from 'mongoose';
import dns from 'dns';

export const connectDB = async (): Promise<void> => {
  try {
    const connString = process.env.MONGO_URI || 'mongodb://localhost:27017/vfstr_aeps';
    
    if (connString.startsWith('mongodb+srv://')) {
      console.log('🌐 MongoDB SRV URL detected: Overriding DNS servers with public DNS (8.8.8.8, 1.1.1.1) to avoid queryTxt lookup timeouts...');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    }

    await mongoose.connect(connString);
    console.log(`📡 MongoDB Connected successfully.`);
  } catch (error: any) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
