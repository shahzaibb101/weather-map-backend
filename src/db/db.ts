import { MongoClient } from "mongodb";
import "dotenv/config";
import BlogModel from "../models/blogs";
import mongoose from "mongoose";
import NewsModel from "../models/news";

const connectionString = process.env.DATABASENOSQL || ""; // Replace with your MongoDB connection string
const dbName = process.env.DATABASENOSQLNAME; // Replace with your database name

async function saveBlog(title: string, description: string, imagesrc: string) {
  try {
    const newBlog = new NewsModel({
      title,
      description,
      imagesrc,
      createdAt: new Date(), // This is optional since createdAt defaults to Date.now()
    });

    await newBlog.save();
    console.log("News saved successfully");
  } catch (error) {
    console.error("Error saving the blog:", error);
  }
}

async function connectToDatabase() {
  try {
    const client = await mongoose.connect(connectionString);
    console.log("Connected to the database");

    
  } catch (error) {
    console.error("Failed to connect to the database", error);
    throw error;
  }
}

export default connectToDatabase;
