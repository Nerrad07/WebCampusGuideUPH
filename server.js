import express from "express";
import dotenv from "dotenv";
import admin from "firebase-admin";
import cors from "cors";
import session from "express-session";
import multer from "multer"; // <-- REQUIRED for file uploads

dotenv.config();

const app = express();

// ------------------------------
// Firebase Admin Initialization
// ------------------------------
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL,
  storageBucket: process.env.STORAGE_BUCKET   // MUST be xxxx.appspot.com
});

// NOW storage and database can be accessed safely
const db = admin.database();
const bucket = admin.storage().bucket();

// Multer (store in memory)
const upload = multer({ storage: multer.memoryStorage() });

// ------------------------------
// Middleware
// ------------------------------

app.set("trust proxy", 1);
const isProd = process.env.NODE_ENV === "production";

app.use(
  cors({
    origin: [
      "https://web-campus-guide-uph.vercel.app",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 6,
    },
  })
);

// ------------------------------
// Authentication login and logout
// ------------------------------

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Missing email or password" });

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const userId = userRecord.uid;
    const snap = await db.ref("admins/" + userId).once("value");

    if (!snap.exists())
      return res.status(403).json({ message: "User is not an admin" });

    req.session.user = {
      id: userId,
      email: userRecord.email,
      isAdmin: true,
    };

    return res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(401).json({ message: "User not found or invalid login" });
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// ------------------------------
// POSTER UPLOAD
// ------------------------------

app.post("/uploadPoster/:eventId", upload.single("poster"), async (req, res) => {
  console.log("It got here")
  try {
    const eventId = req.params.eventId;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const ext = req.file.originalname.split('.').pop(); 
    const fileName = `${eventId}.${ext}`;
    const fileRef = bucket.file(`posters/${fileName}`);
    console.log("It got here")

    await fileRef.save(req.file.buffer, {
      contentType: req.file.mimetype,
      public: true,
    });

    const publicUrl = `https://storage.googleapis.com/b/${process.env.STORAGE_BUCKET}/o/posters/${fileName}`;

    const snap = await db.ref(`events/${eventId}`).once("value");
    if (!snap.exists()) {
      return res.status(404).json({ message: "Event not found" });
    }

    await db.ref(`events/${eventId}`).update({ posterUrl: publicUrl });

    res.json({ url: publicUrl });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
});

// ------------------------------
// Event routes
// ------------------------------

app.get("/auth/me", (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ message: "Not authenticated" });
  res.json(req.session.user);
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get("/events", async (req, res) => {
  try {
    const snapshot = await db.ref("events").once("value");
    res.json(snapshot.val() || {});
  } catch (err) {
    console.error("Fetch events error:", err);
    res.status(500).json({ message: "Failed to fetch events" });
  }
});

app.get("/events/:id", async (req, res) => {
  try {
    const snapshot = await db.ref("events/" + req.params.id).once("value");
    if (!snapshot.exists())
      return res.status(404).json({ message: "Event not found" });
    res.json(snapshot.val());
  } catch (err) {
    console.error("Error fetching event:", err);
    res.status(500).json({ message: "Failed to fetch event" });
  }
});

app.post("/events", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ message: "Unauthorized" });

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
  if (!req.session.user)
    return res.status(401).json({ message: "Unauthorized" });

  try {
    await db.ref(`events/${req.params.id}`).update(req.body);
    res.json({ message: "Event updated" });
  } catch (err) {
    console.error("Update event error:", err);
    res.status(500).json({ message: "Failed to update event" });
  }
});

app.delete("/events/:id", async (req, res) => {
  if (!req.session.user)
    return res.status(401).json({ message: "Unauthorized" });

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
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
