// ✅ Base API URL
const API_URL = "https://web-campus-guide-uph.vercel.app";
// const API_URL = "http://localhost:3000/";

// ✅ DOM reference to event container
const eventsContainer = document.getElementById("events-container-b");

// 🧱 Create a single event card
function createEventCard(event) {
  const card = document.createElement("article");
  card.classList.add("event-card");

  // --- Card body ---
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

  // --- Event status ---
  const status = document.createElement("div");
  status.classList.add("event-card_status");

  const eventStatus = getEventStatus(event);
  status.textContent = eventStatus.label;
  status.style.color = eventStatus.color;

  // --- Combine ---
  card.appendChild(body);
  card.appendChild(status);

  return card;
}

// 🧠 Determine whether event is Upcoming / Ongoing / Past
function getEventStatus(event) {
  try {
    const eventDate = new Date(event.date);
    if (isNaN(eventDate)) return { label: "Unknown", color: "gray" };

    const now = new Date();
    const start = new Date(eventDate);
    const end = new Date(eventDate);

    // Convert minutes since midnight → actual time of day
    start.setMinutes(event.startTimeMinutes || 0);
    end.setMinutes(event.endTimeMinutes || 0);

    if (now >= start && now <= end) {
      return { label: "Ongoing", color: "green" };
    } else if (now < start) {
      return { label: "Upcoming", color: "orange" };
    } else {
      return { label: "Past", color: "gray" };
    }
  } catch (err) {
    console.warn("⚠️ Error parsing event time:", err);
    return { label: "Unknown", color: "gray" };
  }
}

// 🔹 Fetch and render events from Building B
async function loadBuildingBEvents() {
  try {
    console.log("🔹 Fetching events from API...");

    // ✅ Use new public endpoint — no API key required
    const response = await fetch(`https://web-campus-guide-uph.vercel.app/events`);

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

    // Clear previous content
    eventsContainer.innerHTML = "";

    if (buildingBEvents.length === 0) {
      eventsContainer.textContent = "No events found in Building B.";
      return;
    }

    // Sort events by date (optional)
    buildingBEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Render all events
    buildingBEvents.forEach((event) => {
      const card = createEventCard(event);
      eventsContainer.appendChild(card);
    });

  } catch (error) {
    console.error("❌ Error loading events:", error);
    eventsContainer.innerHTML = `<p style="color:red;">Error loading events: ${error.message}</p>`;
  }
}

// 🚀 Run once DOM is fully loaded
document.addEventListener("DOMContentLoaded", loadBuildingBEvents);
