import { getAllEvents } from "../../API/script.js";

const container = document.querySelector('[id^="events-container-"]');
const id = container?.id || "";
const buildingLetter = id.split("-").pop().toUpperCase();
const templateCard = container.querySelector(".event-card");

// Function to render one event
function renderEvent(event) {
  // Clone the template so you can reuse the same structure
  const card = templateCard.cloneNode(true);

  // Fill in values
  card.querySelector(".event-card_title").textContent = event.name;
  
  const startHour = Math.floor(event.startTimeMinutes / 60);
  const startMin = (event.startTimeMinutes % 60).toString().padStart(2, "0");
  const endHour = Math.floor(event.endTimeMinutes / 60);
  const endMin = (event.endTimeMinutes % 60).toString().padStart(2, "0");

  const inside = `
    Held By: ${event.heldBy || "Unknown"} <br>
    Date: ${new Date(event.date).toLocaleDateString()} <br>
    Time: ${startHour}:${startMin} - ${endHour}:${endMin} <br>
    Room: ${event.room || "-"}
  `;

  card.querySelector(".event-card_inside").innerHTML = inside;
  card.querySelector(".event-card_status").textContent = event.published ? "Ongoing" : "Coming Soon";

  return card;
}

async function loadEvents() {
  try {
    const events = await getAllEvents();

    // Filter for Building B
    const buildingBEvents = events.filter(e => e.building?.toUpperCase() === buildingLetter);

    // Clear container but keep one template for cloning
    container.innerHTML = "";
    
    if (buildingBEvents.length === 0) {
      container.innerHTML = "<p>No events found for Building B.</p>";
      return;
    }

    // Add all events
    buildingBEvents.forEach(event => {
      const card = renderEvent(event);
      container.appendChild(card);
    });
  } catch (err) {
    console.error("Failed to load events:", err);
    container.innerHTML = "<p style='color:red;'>Error loading events</p>";
  }
}

loadEvents();
