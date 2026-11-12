import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[MongoDB] Kết nối thành công tới Cluster: ${conn.connection.host}`);
  } catch (error) {
    console.error('[MongoDB] Lỗi kết nối CSDL:', error);
    process.exit(1);
  }
}

