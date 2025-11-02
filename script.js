// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDLFaOnFD4ICf3VJcIfNdeS1Pp5v0P7jLU",
  authDomain: "campus-guide-map-uph.firebaseapp.com",
  databaseURL: "https://campus-guide-map-uph-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "campus-guide-map-uph",
  storageBucket: "campus-guide-map-uph.firebasestorage.app",
  messagingSenderId: "685591421741",
  appId: "1:685591421741:web:61d36494c445b4b6b3a9a4",
  measurementId: "G-NX379L2PWL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Helper to convert date → key (YYYYMMDD)
function formatDateKey(date) {
  if (typeof date === "number") return date.toString();
  if (typeof date === "string") return date.replaceAll("-", "");
  return "";
}

export async function getAllEvents() {
  const eventsRef = ref(db, "events");
  const snapshot = await get(eventsRef);
  const data = snapshot.val();
  if (!data) return [];

  return Object.entries(data).map(([id, event]) => ({
    id,
    ...event
  }));
}

export async function getEventsByDate(dateKey) {
  const dateRef = ref(db, `eventsByDate/${dateKey}`);
  const dateSnap = await get(dateRef);
  const eventIds = dateSnap.val();
  if (!eventIds) return [];

  const events = [];
  for (const eventId of Object.keys(eventIds)) {
    const eventSnap = await get(ref(db, `events/${eventId}`));
    if (eventSnap.exists()) events.push({ id: eventId, ...eventSnap.val() });
  }

  return events;
}

export async function createEvent(eventData) {
  if (!eventData.date) throw new Error("Event must have a date");

  const newEventRef = push(ref(db, "events"));
  const newEventId = newEventRef.key;

  const formattedDate = formatDateKey(eventData.date);
  const timestamp = Date.now();

  const event = {
    ...eventData,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  // Write to /events
  await set(newEventRef, event);

  // Write to /eventsByDate
  await set(ref(db, `eventsByDate/${formattedDate}/${newEventId}`), true);

  return { id: newEventId, ...event };
}


export async function updateEvent(eventId, updatedData) {
  const eventRef = ref(db, `events/${eventId}`);
  const snap = await get(eventRef);
  if (!snap.exists()) throw new Error("Event not found");

  const existingEvent = snap.val();
  const oldDateKey = formatDateKey(existingEvent.date);
  const newDateKey = formatDateKey(updatedData.date || existingEvent.date);

  const timestamp = Date.now();

  // Update /events
  await update(eventRef, { ...updatedData, updatedAt: timestamp });

  // Update /eventsByDate if date changed
  if (oldDateKey !== newDateKey) {
    await remove(ref(db, `eventsByDate/${oldDateKey}/${eventId}`));
    await set(ref(db, `eventsByDate/${newDateKey}/${eventId}`), true);
  }

  return { id: eventId, ...existingEvent, ...updatedData, updatedAt: timestamp };
}

export async function deleteEvent(eventId) {
  const eventRef = ref(db, `events/${eventId}`);
  const snap = await get(eventRef);
  if (!snap.exists()) throw new Error("Event not found");

  const event = snap.val();
  const dateKey = formatDateKey(event.date);

  await remove(eventRef); // remove from /events
  await remove(ref(db, `eventsByDate/${dateKey}/${eventId}`)); // remove index entry

  return { success: true };
}

export function listenToAllEvents(callback) {
  const eventsRef = ref(db, "events");
  onValue(eventsRef, (snapshot) => {
    const data = snapshot.val() || {};
    const events = Object.entries(data).map(([id, event]) => ({ id, ...event }));
    callback(events);
  });
}