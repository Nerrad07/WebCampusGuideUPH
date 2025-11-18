import express from "express";
import dotenv from "dotenv";
import admin from "firebase-admin";
import cors from "cors";
import session from "express-session";
import fetch from "node-fetch";
import multer from "multer";
import { getStorage } from "firebase-admin/storage";



dotenv.config();

const app = express();

const upload = multer({ storage: multer.memoryStorage() });

// ------------------------------
// Firebase Admin Initialization
// ------------------------------
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
});

const db = admin.database();

// ------------------------------
// Middleware
// ------------------------------

// IMPORTANT for Vercel — allow secure cookies
app.set("trust proxy", 1);

const isProd = process.env.NODE_ENV === "production";

// ------------------------------
// CORS (ALLOW COOKIE CROSS-SITE)
// ------------------------------
app.use(
  cors({
    origin: [
      "https://web-campus-guide-uph.vercel.app",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true, // REQUIRED for cookies
  })
);

app.options("*", cors());
app.use(express.json());

// ------------------------------
// Sessions (Secure on Vercel)
// ------------------------------
app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: isProd,        // cookie only sent via HTTPS in production
      sameSite: isProd ? "none" : "lax", // REQUIRED for cross-site cookies
      maxAge: 1000 * 60 * 60 * 6, // 6 hours
    },
  })
);

// ------------------------------
// Authentication Routes
// ------------------------------
app.post("/auth/login", async (req, res) => {
  console.log("LOGIN REQUEST BODY:", req.body);

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Missing email or password" });
  }

  try {
    const usersRef = db.ref("users");
    const snapshot = await usersRef.orderByChild("email").equalTo(email).once("value");

    if (!snapshot.exists()) {
      return res.status(401).json({ message: "User not found" });
    }

    const users = snapshot.val();
    const userId = Object.keys(users)[0];
    const user = users[userId];

    if (user.password !== password) {
      return res.status(401).json({ message: "Invalid password" });
    }

    if (!user.isAdmin) {
      return res.status(403).json({ message: "User is not an admin" });
    }

    req.session.user = { id: userId, email: user.email, isAdmin: true };

    return res.json({ success: true, user: req.session.user });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

app.post("/uploadPoster/:eventId", upload.single("poster"), async (req, res) => {
  try {
    const { eventId } = req.params;
    const file = req.file;

    if (!file) return res.status(400).json({ message: "No file uploaded" });

    const ext = file.originalname.split('.').pop() || "jpg";
    const filePath = `posters/${eventId}/poster.${ext}`;

    const bucket = getStorage().bucket();
    const fileRef = bucket.file(filePath);

    await fileRef.save(file.buffer, {
      contentType: file.mimetype,
      public: true
    });

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    return res.json({ url: publicUrl });

  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

// Check current authenticated user
app.get("/auth/me", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  res.json(req.session.user);
});

// Logout
app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ------------------------------
// PUBLIC GET EVENTS (NO AUTH)
// ------------------------------
app.get("/events", async (req, res) => {
  try {
    const snapshot = await db.ref("events").once("value");
    const data = snapshot.val() || {};
    res.json(data);
  } catch (err) {
    console.error("Fetch events error:", err);
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

app.get("/events/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const snapshot = await db.ref("events/" + id).once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(snapshot.val());
  } catch (err) {
    console.error("Error fetching event:", err);
    res.status(500).json({ message: "Failed to fetch event" });
  }
});


// ------------------------------
// CREATE OR UPDATE EVENT (AUTH REQUIRED)
// ------------------------------
app.post("/events", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const newEventRef = db.ref("events").push();
    await newEventRef.set(req.body);

    res.json({ message: "Event created", id: newEventRef.key });
  } catch (err) {
    console.error("Create event error:", err);
    res.status(500).json({ message: "Failed to create event" });
  }
});

app.put("/events/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await db.ref(`events/${req.params.id}`).update(req.body);
    res.json({ message: "Event updated" });
  } catch (err) {
    console.error("Update event error:", err);
    res.status(500).json({ message: "Failed to update event" });
  }
});

// ------------------------------
// DELETE EVENT (AUTH REQUIRED)
// ------------------------------
app.delete("/events/:id", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    await db.ref(`events/${req.params.id}`).remove();
    res.json({ message: "Event deleted" });
  } catch (err) {
    console.error("Delete event error:", err);
    res.status(500).json({ message: "Failed to delete event" });
  }
});

// ------------------------------
// Start Server
// ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
