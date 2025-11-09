// ✅ building.js (with event time classification)

const API_URL = "https://vercel.com/darr-jov-no-brys-projects/web-campus-guide-uph/2cbeTRpg6FcERi1SJvQnK9uvmJZP";
const API_KEY = "myLocalTestKey123"; // same as in Firebase RTDB

const eventsContainer = document.getElementById("events-container-b");

// Helper to build each event card
function createEventCard(event) {
  const card = document.createElement("article");
  card.classList.add("event-card");

  const body = document.createElement("div");
  body.classList.add("event-card_body");

  const title = document.createElement("h3");
  title.classList.add("event-card_title");
  title.textContent = event.name || "Untitled Event";

  const details = document.createElement("p");
  details.classList.add("event-card_inside");
  details.textContent = `${event.heldBy || "Unknown"} • Floor ${event.floor || "?"} • Room ${event.room || "-"}`;

  body.appendChild(title);
  body.appendChild(details);

  // Determine event status (Ongoing, Upcoming, Past)
  const status = document.createElement("div");
  status.classList.add("event-card_status");

  const eventStatus = getEventStatus(event);
  status.textContent = eventStatus.label;
  status.style.color = eventStatus.color;

  card.appendChild(body);
  card.appendChild(status);

  return card;
}

// 🧠 Determine event status (based on date & start/end times)
function getEventStatus(event) {
  try {
    // Get event date (in ms)
    const eventDate = new Date(event.date);
    if (isNaN(eventDate)) return { label: "Unknown", color: "gray" };

    const now = new Date();
    const start = new Date(eventDate);
    const end = new Date(eventDate);

    // Convert minutes since midnight → actual time of day
    start.setMinutes(event.startTimeMinutes || 0);
    end.setMinutes(event.endTimeMinutes || 0);

    // Compare times
    if (now >= start && now <= end) {
      return { label: "Ongoing", color: "green" };
    } else if (now < start) {
      return { label: "Upcoming", color: "orange" };
    } else {
      return { label: "Past", color: "gray" };
    }
  } catch (err) {
    console.warn("Error parsing event time:", err);
    return { label: "Unknown", color: "gray" };
  }
}

// 🧩 Fetch and render all events from Building B
async function loadBuildingBEvents() {
  try {
    console.log("🔹 Fetching events from API...");

    const response = await fetch(API_URL, {
      method: "GET",
      headers: {
        "x-api-key": API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch (status: ${response.status})`);
    }

    const data = await response.json();
    const events = Object.values(data || {});
    console.log("✅ Events fetched:", events);

    // Filter only events from Building B
    const buildingBEvents = events.filter(
      (e) => e.building && e.building.toUpperCase() === "B"
    );

    // Clear old content
    eventsContainer.innerHTML = "";

    if (buildingBEvents.length === 0) {
      eventsContainer.textContent = "No events found in Building B.";
      return;
    }

    // Sort events by date/time (optional)
    buildingBEvents.sort((a, b) => (a.date || 0) - (b.date || 0));

    // Render all
    buildingBEvents.forEach((event) => {
      const card = createEventCard(event);
      eventsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("❌ Error loading events:", error);
    eventsContainer.innerHTML = `<p style="color:red;">Error loading events: ${error.message}</p>`;
  }
}

// Run after DOM loaded
document.addEventListener("DOMContentLoaded", loadBuildingBEvents);
