import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import dotenv from "dotenv/config";
import validator from "validator";
import nodemailer from "nodemailer";
const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Signup route
router.post("/signup", async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  // Create the users table if it doesn't exist
  console.log("Creating table");
  const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL
        )
`;
  await pool.query(createTableQuery);

  try {
    // Validate name, email, and password
    if (!name) {
      console.log("Name is required");
      return res.status(400).json({ message: "Name is required" });
    }

    if (!validator.isEmail(email)) {
      console.log("Invalid email");
      return res.status(400).json({ message: "Invalid email" });
    }

    if (!validator.isLength(password, { min: 6 })) {
      console.log("Password must be at least 6 characters long");
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }
    console.log("Validated");

    // Check if the user already exists in the database
    const userQuery = "SELECT * FROM users WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);
    const existingUser = userResult.rows[0];

    if (existingUser) {
      console.log("User already exists");
      return res.status(409).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const insertQuery =
      "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id";
    const insertResult = await pool.query(insertQuery, [
      name,
      email,
      hashedPassword,
    ]);
    const userId = insertResult.rows[0].id;

    // Generate a JWT token
    const token = jwt.sign(
      { userId },
      process.env.JWT_SECRET?.toString() || "crackmeifyoucan"
    );
    console.log("Signup successful", token);
    res.status(201).json({ token });
  } catch (error) {
    console.error("Error during signup:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login route
// Login route
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Check if the user exists in the database
    const userQuery = "SELECT * FROM users WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);
    const user = userResult.rows[0];

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // Compare the provided password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("Invalid password");
      return res.status(401).json({ message: "Invalid password" });
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || "");
    console.log("Login successful");
    res.status(200).json({ token });
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Authenticate route
router.post("/authenticate", async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    return res
      .status(400)
      .json({ message: "Token is required and must be a string" });
  }

  try {
    // Verify the JWT token
    const decodedToken = jwt.verify(
      token,
      process.env.JWT_SECRET?.toString() || "crackmeifyoucan"
    );

    if (!decodedToken) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Get the user ID from the decoded token
    const userId = (decodedToken as any).userId;

    // Fetch the user from the database
    const userQuery = "SELECT * FROM users WHERE id = $1";
    const userResult = await pool.query(userQuery, [userId]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error during authentication:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/user/:email", async (req: Request, res: Response) => {
  const { email } = req.params;

  try {
    const userQuery = "SELECT * FROM users WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("Error during fetching user:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/passwordChange", async (req: Request, res: Response) => {
  const { email, password, otp } = req.body;

  console.log("Changing password" , email, password, otp);

  try {
    // Check if the user exists in the database
    const userQuery = "SELECT * FROM users WHERE email = $1";
    const user = await pool.query(userQuery, [email]);
    const userResult = user.rows[0];

    if (!userResult) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    // Check if the OTP is correct
    if (userResult.otp != otp) {
      console.log("Invalid OTP"  , userResult.otp);
      return res.status(401).json({ message: "Invalid OTP" });
    }

    // Hash the password

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the new password into the database
    const updateQuery = "UPDATE users SET password = $1 WHERE email = $2";
    await pool.query(updateQuery, [hashedPassword, email]);
    console.log("Password changed successfully");
    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Error during password change:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/passwordChangeRequest", async (req: Request, res: Response) => {
  const { email } = req.body;

  try {
    const userQuery = "SELECT * FROM users WHERE email = $1";
    const userResult = await pool.query(userQuery, [email]);
    const user = userResult.rows[0];

    if (!user) {
      console.log("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    const updateQuery = "ALTER TABLE users ADD COLUMN IF NOT EXISTS otp INTEGER";
    await pool.query(updateQuery);

    const updateOtpQuery = "UPDATE users SET otp = $1 WHERE email = $2";
    await pool.query(updateOtpQuery, [otp, email]);

    // Send the OTP to the user's email
    await sendMail(email, otp);

    console.log("OTP sent to the user's email");
    res.status(200).json({ message: "OTP sent to the user's email" });
  } catch (error) {
    console.error("Error during password change request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

const sendMail = async (email: string, otp: number) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587, // You can also use port 465 for SSL
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  const html = `
      <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Link For Password Change</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #000000; /* Foreground color */
            background-color: #ffffff; /* Background color */
            margin: 0;
            padding: 0;
            height: 100vh; /* Set the height to 100% viewport height */
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            padding: 20px;
            
            background-color: #ffffff; /* Background color */
        }
        h1 {
            color: #000000; /* Accent color */
        }
            h2 {
            color: #000000; /* Accent color */
        }
        p {
            margin: 10px 0;
            color: #000000; /* Accent color */
        }
        .field {
            font-weight: bold;
        }
        .value {
            margin-left: 10px;
        }
        .logo {
            max-width: 200px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Weather Map</h1>
        <h2>Link For Password Change</h2>
        <p>Click on the link below to change your password: ${process.env.FRONTEND_URL}/reset-password/${email}/${otp}</p>
        
    </div>
</body>
</html>

`;

  const mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: "Link For Password Change",
    html: html,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error:", error);
  }
};

export default router;
