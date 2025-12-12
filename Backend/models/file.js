import mongoose from 'mongoose';


const fileSchema = new mongoose.Schema({
filename: { type: String, required: true },
originalname: { type: String },
path: { type: String, required: true },
size: { type: Number, required: true },
privacy: { type: String, enum: ['public', 'private'], default: 'private' },
uploaded_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
uploaded_at: { type: Date, default: Date.now },
shareable_token: { type: String }
});


export default mongoose.model('FileMeta', fileSchema);