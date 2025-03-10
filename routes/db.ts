import mongoose, { Connection } from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://education:Ee4a2yjrotlpqalG@cluster0.ugi7clf.mongodb.net/education';

const connectDB = async (): Promise<Connection> => {
    try {
        await mongoose.connect(MONGO_URI, {
            dbName: 'education' // Optional but recommended for clarity
        });

        console.log('Database connected successfully');
        return mongoose.connection;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1); // Exit process with failure
    }
};

const db = mongoose.connection;

db.on('error', (err: Error) => {
    console.error('MongoDB Error:', err);
});

export default connectDB;
