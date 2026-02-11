import mongoose, { Schema, Document } from 'mongoose';

interface IBlog extends Document {
    title: string;
    description: string;
    createdAt: Date;
    imagesrc: string;
}

const BlogSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    imagesrc: { type: String, required: true },
});

const BlogModel = mongoose.model<IBlog>('Blog', BlogSchema);

export default BlogModel;