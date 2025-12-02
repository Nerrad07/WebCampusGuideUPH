// server.js — Express API with Firebase Admin + Email/Password Auth on backend

import express from "express";
import dotenv from "dotenv";
import admin from "firebase-admin";
import cors from "cors";
import session from "express-session";
import multer from "multer"; // for file uploads
import fetch from "node-fetch"; // for Firebase Auth REST API

dotenv.config();

const app = express();

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.DATABASE_URL,
    storageBucket: process.env.STORAGE_BUCKET,
});

const db = admin.database();
const bucket = admin.storage().bucket();

const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.set("trust proxy", 1);
const isProd = process.env.NODE_ENV === "production";

app.use(
    cors({
        origin: [
        "https://frontendcampusguidemap.vercel.app",
        "https://web-campus-guide-uph.vercel.app",
        "http://localhost:3000",
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

// Authentication login and logout
app.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password" });
    }

    try {
        const resp = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            email,
            password,
            returnSecureToken: true,
            }),
        }
        );

        if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        console.error("Firebase password verify failed:", errData);
        return res.status(401).json({ message: "Invalid email or password" });
        }

        const data = await resp.json();
        const userId = data.localId;

        const snap = await db.ref("admins/" + userId).once("value");
        if (!snap.exists()) {
        return res.status(403).json({ message: "User is not an admin" });
        }

        req.session.user = {
        id: userId,
        email: data.email,
        isAdmin: true,
        };

        return res.json({ success: true, user: req.session.user });
    } catch (err) {
        console.error("LOGIN ERROR:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.post("/auth/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({ success: true });
    });
});

app.get("/auth/me", async (req, res) => {
    try {
        if (!req.session.user) {
        return res.status(401).json({ message: "Not authenticated" });
        }

        const { id, email } = req.session.user;

        const snap = await db.ref("admins/" + id).once("value");

        if (!snap.exists()) {
        return res.status(403).json({ message: "User no longer an admin" });
        }

        const isAdmin = snap.child("isAdmin").val();

        if (!isAdmin) {
        return res.status(403).json({ message: "User is not an admin" });
        }

        // 3. Return full user object
        return res.json({
        id,
        email,
        isAdmin: true
        });

    } catch (err) {
        console.error("auth/me error:", err);
        return res.status(500).json({ message: "Server error" });
    }
});

app.get("/admins", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    const uid = req.session.user.id;

    try {
        const ref = db.ref(`admins/${uid}`);
        const snapshot = await ref.get();

        if (!snapshot.exists()) {
        return res.status(403).json({ message: "Not an admin" });
        }

        return res.json({
        uid,
        email: req.session.user.email,
        isAdmin: true
        });

    } catch (err) {
        console.error("Error in /admins:", err);
        return res.status(500).json({ message: "Server error" });
    }
});

app.post("/auth/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: "Missing email",
            code: "missing-email",
        });
    }

    try {
        const resp = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${process.env.FIREBASE_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    requestType: "PASSWORD_RESET",
                    email,
                }),
            }
        );

        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
            const msg = data?.error?.message || "";
            console.error("Forgot-password error from Firebase:", msg);

            if (msg === "EMAIL_NOT_FOUND") {
                return res.status(404).json({
                    message: "No user found with that email",
                    code: "user-not-found",
                });
            }

            if (msg === "INVALID_EMAIL") {
                return res.status(400).json({
                    message: "Invalid email address",
                    code: "invalid-email",
                });
            }

            if (msg === "TOO_MANY_ATTEMPTS_TRY_LATER") {
                return res.status(429).json({
                    message: "Too many attempts. Try again later.",
                    code: "too-many-requests",
                });
            }

            return res.status(500).json({
                message: "Failed to send reset email",
                code: "firebase-error",
            });
        }

        return res.json({
            success: true,
            message: "Reset link sent",
        });
    } catch (err) {
        console.error("Forgot-password server error:", err);
        return res.status(500).json({
            message: "Internal server error",
            code: "server-error",
        });
    }
});

app.post("/uploadPoster/:eventId", upload.single("poster"), async (req, res) => {
    console.log("UploadPoster route hit");
    try {
        const eventId = req.params.eventId;

        if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
        }

        const ext = req.file.originalname.split(".").pop();
        const fileName = `${eventId}.${ext}`;
        const fileRef = bucket.file(`posters/${fileName}`);
        console.log("Saving file to bucket as", fileName);

        await fileRef.save(req.file.buffer, {
        contentType: req.file.mimetype,
        public: true,
        });

        const publicUrl = `https://storage.googleapis.com/${process.env.STORAGE_BUCKET}/posters/${fileName}`;

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

app.get("/checkRoomConflict", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const timestamp = Number(req.query.date);
        const room = req.query.room;

        if (!timestamp || !room) {
            return res.status(400).json({ message: "Missing date or room parameter" });
        }

        const d = new Date(timestamp);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const dateKey = `${yyyy}${mm}${dd}`;

        console.log("[ConflictAPI] timestamp:", timestamp, "→ dateKey:", dateKey);

        const dateSnap = await db.ref(`eventsByDate/${dateKey}`).once("value");

        if (!dateSnap.exists()) {
            console.warn("[ConflictAPI] No eventsByDate entry found for:", dateKey);
            return res.json([]);
        }

        const eventIds = Object.keys(dateSnap.val());
        console.log("[ConflictAPI] Event IDs found:", eventIds);

        const results = [];

        for (const id of eventIds) {
            const evSnap = await db.ref(`events/${id}`).once("value");
            if (!evSnap.exists()) {
                console.warn("[ConflictAPI] Missing event details for ID:", id);
                continue;
            }

            const ev = evSnap.val();

            if (ev.room !== room) continue;

            results.push({
                name: ev.name || "",
                startTimeMinutes: ev.startTimeMinutes,
                endTimeMinutes: ev.endTimeMinutes
            });
        }

        console.log("[ConflictAPI] Final filtered results:", results);

        return res.json(results);

    } catch (err) {
        console.error("Error in /checkRoomConflict:", err);
        return res.status(500).json({ message: "Server error" });
    }
});


app.post("/eventsByDate", async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const { eventId, dateTimestamp } = req.body;

        if (!eventId || !dateTimestamp) {
            return res.status(400).json({ message: "eventId and dateTimestamp are required" });
        }

        const d = new Date(Number(dateTimestamp));
        const yyyy = d.getUTCFullYear().toString();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");

        const dateKey = `${yyyy}${mm}${dd}`;

        await db.ref(`eventsByDate/${dateKey}/${eventId}`).set(true);

        return res.json({
            message: "Event successfully added to eventsByDate",
            dateKey,
            path: `eventsByDate/${dateKey}/${eventId}`
        });

    } catch (err) {
        console.error("Error updating eventsByDate:", err);
        return res.status(500).json({ message: "Server error" });
    }
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
        if (!snapshot.exists()) {
        return res.status(404).json({ message: "Event not found" });
        }
        res.json(snapshot.val());
    } catch (err) {
        console.error("Error fetching event:", err);
        res.status(500).json({ message: "Failed to fetch event" });
    }
});

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
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
