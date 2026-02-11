import express, { Request, Response } from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { parse } from "json2csv";

dotenv.config();

import weatherRouter from "./routes/weather/weather";
import authRouter from "./routes/auth/auth";
import dataRouter from "./routes/information/blogsAndNews";
import connectToDatabase from "./db/db";
import BlogModel from "./models/blogs";
const app: express.Application = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

connectToDatabase();


app.use("/api" , weatherRouter);
app.use("/auth", authRouter);
app.use("/data", dataRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
