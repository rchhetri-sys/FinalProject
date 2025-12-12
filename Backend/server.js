import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import fileRoutes from './routes/file.js';
import cors from 'cors';
import morgan from 'morgan';

dotenv.config();
const app = express();
const uploadDir = process.env.UPLOAD_DIR || 'uploads';

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(uploadDir)));

connectDB();
app.use('/api', authRoutes);
app.use('/api', fileRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));