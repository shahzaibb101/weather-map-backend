import mongoose, { Schema, Document } from 'mongoose';

interface INews extends Document {
    title: string;
    description: string;
    createdAt: Date;
    imagesrc: string;
}

const NewsSchema: Schema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    imagesrc: { type: String, required: true },
});

const NewsModel = mongoose.model<INews>('News', NewsSchema);

export default NewsModel;