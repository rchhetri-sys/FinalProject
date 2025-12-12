import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/files.js';
import cors from 'cors';
import morgan from 'morgan';


dotenv.config();
const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static(process.env.UPLOAD_DIR || 'uploads'));


connectDB();
app.use('/api', authRoutes);
app.use('/api', fileRoutes);


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));