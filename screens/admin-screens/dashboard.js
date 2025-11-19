const API_BASE = "https://web-campus-guide-uph.vercel.app";
const tableBody = document.querySelector("tbody");

const ongoingCountEl = document.querySelector(".OA");
const upcomingCountEl = document.querySelector(".UA");
const comingSoonCountEl = document.querySelector(".CSA");

// NEW: DOM for delete flow
const removeBtn = document.getElementById("remove-btn");
const confirmModal = document.getElementById("confirm-delete-modal");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const editBtn = document.querySelector(".edit button");
document.getElementById("seedBtn").addEventListener("click", seedEvents);

// NEW: selection state
let selectedEventId = null;
let selectedRow = null;

function formatDate(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(start, end) {
  const toTime = (mins) => {
    const h = Math.floor(mins / 60)
      .toString()
      .padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };
  return `${toTime(start)}–${toTime(end)}`;
}

function getEventStatus(event) {
  const now = new Date();
  const today = now.getTime();
  const eventDate = new Date(event.date);
  const diffDays = Math.floor((eventDate - today) / (1000 * 60 * 60 * 24));

  const startTime = event.startTimeMinutes || 0;
  const endTime = event.endTimeMinutes || 0;

  if (
    diffDays === 0 &&
    now.getHours() * 60 + now.getMinutes() >= startTime &&
    now.getHours() * 60 + now.getMinutes() <= endTime
  ) {
    return "Ongoing";
  }

  if (diffDays > 0 && diffDays < 30) return "Upcoming";
  if (diffDays >= 30) return "Coming Soon";
  if (diffDays < 0) return "Past";

  return "Unknown";
}

async function loadEvents() {
  try {
    // reset selection whenever we reload
    selectedEventId = null;
    selectedRow = null;
    if (removeBtn) removeBtn.disabled = true;

    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // IMPORTANT: keep IDs from the object keys
    const events = Object.entries(data).map(([id, event]) => ({
      id,
      ...event,
    }));

    tableBody.innerHTML = "";

    if (events.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.textContent = "No events found.";
      td.style.textAlign = "center";
      tr.appendChild(td);
      tableBody.appendChild(tr);
      ongoingCountEl.textContent = 0;
      upcomingCountEl.textContent = 0;
      comingSoonCountEl.textContent = 0;
      return;
    }

    let ongoing = 0,
      upcoming = 0,
      comingSoon = 0;

    events.forEach((event, index) => {
      const tr = document.createElement("tr");

      // attach ID to row for delete
      tr.dataset.eventId = event.id;

      const tdNo = document.createElement("td");
      tdNo.textContent = index + 1;

      const tdName = document.createElement("td");
      tdName.textContent = event.name || "-";

      const tdHeldBy = document.createElement("td");
      tdHeldBy.textContent = event.heldBy || "Unknown";

      const tdTime = document.createElement("td");
      tdTime.textContent = formatTime(
        event.startTimeMinutes,
        event.endTimeMinutes
      );

      const tdDate = document.createElement("td");
      tdDate.textContent = formatDate(event.date);

      tr.append(tdNo, tdName, tdHeldBy, tdTime, tdDate);
      tableBody.appendChild(tr);

      // --- NEW: click to select row ---
      tr.addEventListener("click", () => {
        selectedEventId = tr.dataset.eventId;

        // remove selection from all rows
        document
          .querySelectorAll(".table tbody tr")
          .forEach((row) => row.classList.remove("selected"));

        // highlight current one
        tr.classList.add("selected");
        selectedRow = tr;

        if (removeBtn) removeBtn.disabled = false;
      });

      const status = getEventStatus(event);
      if (status === "Ongoing") ongoing++;
      else if (status === "Upcoming") upcoming++;
      else if (status === "Coming Soon") comingSoon++;
    });

    ongoingCountEl.textContent = ongoing;
    upcomingCountEl.textContent = upcoming;
    comingSoonCountEl.textContent = comingSoon;
  } catch (err) {
    console.error("Error loading events:", err);
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Failed to load events.";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tableBody.appendChild(tr);

    ongoingCountEl.textContent = 0;
    upcomingCountEl.textContent = 0;
    comingSoonCountEl.textContent = 0;
  }
}

// ===== DELETE FLOW =====

// open confirm modal when clicking "Remove"
if (removeBtn) {
  removeBtn.addEventListener("click", () => {
    if (!selectedEventId) {
      alert("Please select an event to delete first.");
      return;
    }
    confirmModal.classList.add("show");
  });
}

if (editBtn) {
  editBtn.addEventListener("click", () => {
    if (!selectedEventId) {
      alert("Please select an event to edit first.");
      return;
    }

    // Redirect to add.html with ?id=xxxx
    window.location.href = `add.html?id=${selectedEventId}`;
  });
}

// close modal without deleting
if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener("click", () => {
    confirmModal.classList.remove("show");
  });
}

// confirm delete -> call backend
if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener("click", async () => {
    if (!selectedEventId) return;

    try {
      const res = await fetch(`${API_BASE}/events/${selectedEventId}`, {
        method: "DELETE",
        credentials: "include", // keep session if backend uses express-session
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to delete (HTTP ${res.status})`);
      }

      // Option A: reload all events (simplest)
      await loadEvents();
    } catch (err) {
      console.error(err);
      alert("Failed to delete event: " + err.message);
    } finally {
      confirmModal.classList.remove("show");
    }
  });
}

// SEED EVENTS — uploads events_seed.json to your API
async function seedEvents() {
    if (!confirm("Seed 50 events into the database?")) return;

    try {
        // 1. Load the local JSON file
        const response = await fetch("./events_seed.json");
        const events = await response.json();

        // Validate it is an array
        if (!Array.isArray(events)) {
            throw new Error("events_seed.json did not return an array");
        }

        // 2. Push each event to backend, backend will assign ID
        for (const event of events) {
            const res = await fetch(`${API_BASE}/events`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(event)
            });

            if (!res.ok) {
                console.error("Failed to add event:", await res.text());
            }
        }

        alert("All events seeded successfully!");

    } catch (err) {
        console.error("Seed error:", err);
        alert("Error seeding events — see console");
    }
}


window.addEventListener("DOMContentLoaded", loadEvents);
