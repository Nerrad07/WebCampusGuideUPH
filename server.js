import express from "express";
import dotenv from "dotenv";
import admin from "firebase-admin";
import cors from "cors";
import session from "express-session";
import fetch from "node-fetch";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "https://web-campus-guide-uph.vercel.app", // deployed
    "http://localhost:5500", // local
    "http://127.0.0.1:5500",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true 
}));

app.use(express.json());

// Initialize sessions
app.use(session({
  secret: process.env.SESSION_SECRET || "supersecretkey",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production", 
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", 
    maxAge: 1000 * 60 * 60 * 6 
  }
}));

// Firebase Admin Initialization 
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});

const db = admin.database();

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Missing email or password" });

    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
    const firebaseRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );

    const data = await firebaseRes.json();
    if (!firebaseRes.ok) {
      return res
        .status(401)
        .json({ message: data.error?.message || "Invalid credentials" });
    }

    const decoded = await admin.auth().verifyIdToken(data.idToken);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: user not an admin" });
    }

    req.session.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role,
    };

    res.json({
      message: "✅ Admin verified and session created",
      user: req.session.user,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});


//Middleware to protect admin-only routes
function requireAdminSession(req, res, next) {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized or session expired" });
}

//Logout route (clears session)
app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ message: "Error logging out" });
    res.clearCookie("connect.sid", {
      path: "/",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production"
    });
    res.json({ message: "✅ Logged out successfully" });
  });
});

// CRUD -->
//CREATE
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

//READ ALL EVENTS
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

//READ SINGLE EVENT
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

//UPDATE EVENT
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

//DELETE EVENT
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
//Local testing
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Event API running at http://localhost:${PORT}`));