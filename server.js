import express from "express";
import dotenv from "dotenv";
import admin from "firebase-admin";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors({
  origin: [
    "https://web-campus-guide-uph.vercel.app"
  ]
}));
app.use(express.json());

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATABASE_URL
});

const db = admin.database();

//AUTH
async function verifyApiKey(req, res, next) {
  try {
    const authHeader = (req.headers.authorization || "").split(" ");
    if (authHeader[0] === "Bearer" && authHeader[1]) {
      const idToken = authHeader[1];
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.auth = decoded;

        const adminSnapshot = await db.ref(`admins/${decoded.uid}`).once("value");
        if (adminSnapshot.exists() && adminSnapshot.val() === true) {
          return next();
        }

        return res.status(403).json({ message: "Forbidden: user not authorized" });
      } catch (err) {
        console.warn("Invalid Firebase token:", err.message || err);
      }
    }

    const clientKey =
      req.headers["x-api-key"] ||
      req.query.apiKey ||
      req.body?.apiKey;
    if (clientKey) {
      const keySnapshot = await db.ref(`apiKeys/${clientKey}`).once("value");
      const keyData = keySnapshot.exists() ? keySnapshot.val() : null;

      if (keyData && ((typeof keyData === "object" && keyData.allowed) || keyData === true)) {
        req.apiKeyMeta = (typeof keyData === "object") ? keyData : { key: clientKey };
        return next();
      }

      return res.status(403).json({ message: "Forbidden: invalid API key" });
    }

    return res.status(401).json({ message: "Unauthorized: provide Authorization Bearer token or x-api-key" });
  } catch (err) {
    console.error("verifyApiKey error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}

//CREATE EVENT
app.post("/events", verifyApiKey, async (req, res) => {
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

app.get("/events", async (req, res) => {
  try {
    const snapshot = await db.ref("events").once("value");
    const events = snapshot.val() || {};
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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
app.put("/events/:id", verifyApiKey, async (req, res) => {
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
app.delete("/events/:id", verifyApiKey, async (req, res) => {
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

//local testing only
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Event API running at http://localhost:${PORT}`));
