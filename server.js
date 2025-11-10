import express from "express";
import dotenv from "dotenv";
import admin from "firebase-admin";
import cors from "cors";
import session from "express-session";

dotenv.config();

const app = express();

// ✅ Allow frontend origins
app.use(cors({
  origin: [
    "https://web-campus-guide-uph.vercel.app",
    "http://localhost:5500"
  ],
  credentials: true // allow cookies
}));
app.use(express.json());

// ✅ Initialize sessions
app.use(session({
  secret: process.env.SESSION_SECRET || "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // ⚠️ Set to true if using HTTPS only
    maxAge: 1000 * 60 * 60 * 6 // 6 hours session
  }
}));

// --- Firebase Admin Initialization ---
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});

const db = admin.database();

//
// 🔐 AUTH LOGIC WITH SESSION
//

// 🔹 Step 1: One-time verification route
app.post("/auth/login", async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: "Missing ID token" });

    // Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(idToken);

    // Only allow admin roles
    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: user not an admin" });
    }

    // Save user info in session
    req.session.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role
    };

    res.json({ message: "✅ Admin verified and session created", user: req.session.user });
  } catch (err) {
    console.error("Login verification failed:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

// 🔹 Step 2: Middleware to check session
function requireAdminSession(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized or session expired" });
}

// 🔹 Step 3: Logout route
app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Error logging out" });
    res.clearCookie("connect.sid");
    res.json({ message: "✅ Logged out successfully" });
  });
});

//
// --- 📅 CRUD ROUTES ---
//

// 🟢 CREATE EVENT (admin only, session verified)
app.post("/events", requireAdminSession, async (req, res) => {
  try {
    const event = req.body;
    const ref = db.ref("events").push();

    await ref.set({
      ...event,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });

    const dateKey = new Date(event.date).toISOString().slice(0, 10).replace(/-/g, "");
    await db.ref(`eventsByDate/${dateKey}/${ref.key}`).set(true);

    res.status(201).json({ id: ref.key, message: "Event created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔵 READ ALL EVENTS (public)
app.get("/events", async (req, res) => {
  try {
    const snapshot = await db.ref("events").once("value");
    const events = snapshot.val() || {};
    res.json(events);
  } catch (error) {
    console.error("Error reading events:", error);
    res.status(500).json({ error: error.message });
  }
});

// 🔵 READ SINGLE EVENT (public)
app.get("/events/:id", async (req, res) => {
  try {
    const snapshot = await db.ref(`events/${req.params.id}`).once("value");
    if (!snapshot.exists()) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(snapshot.val());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🟠 UPDATE EVENT (admin only)
app.put("/events/:id", requireAdminSession, async (req, res) => {
  try {
    const eventId = req.params.id;
    const updates = req.body;
    updates.updatedAt = Date.now();

    const eventRef = db.ref(`events/${eventId}`);
    const oldSnapshot = await eventRef.once("value");

    if (!oldSnapshot.exists()) {
      return res.status(404).json({ message: "Event not found" });
    }

    const oldEvent = oldSnapshot.val();
    const oldDateKey = new Date(oldEvent.date).toISOString().slice(0, 10).replace(/-/g, "");
    const newDateKey = new Date(updates.date || oldEvent.date).toISOString().slice(0, 10).replace(/-/g, "");

    await eventRef.update(updates);

    if (oldDateKey !== newDateKey) {
      await db.ref(`eventsByDate/${oldDateKey}/${eventId}`).remove();
      await db.ref(`eventsByDate/${newDateKey}/${eventId}`).set(true);
    }

    res.json({ message: "Event updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔴 DELETE EVENT (admin only)
app.delete("/events/:id", requireAdminSession, async (req, res) => {
  try {
    const eventId = req.params.id;
    const snapshot = await db.ref(`events/${eventId}`).once("value");

    if (!snapshot.exists()) {
      return res.status(404).json({ message: "Event not found" });
    }

    const event = snapshot.val();
    const dateKey = new Date(event.date).toISOString().slice(0, 10).replace(/-/g, "");

    await db.ref(`events/${eventId}`).remove();
    await db.ref(`eventsByDate/${dateKey}/${eventId}`).remove();

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

//
// --- Local Test Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Event API running at http://localhost:${PORT}`));
