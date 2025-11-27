const API_BASE = "https://web-campus-guide-uph.vercel.app";

// Secure session check using a harmless POST request
(async function secureSessionCheck() {
  try {
    const res = await fetch(`${API_BASE}/events`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ invalid: true }) // <-- intentionally invalid
    });

    if (res.status === 401) {
      alert("Unauthorized access. Redirecting...");
      window.location.href = "../user-screens/map-screen.html";
      return;
    }

    // If it's 400 → VALID ADMIN SESSION (bad request because body is wrong)
    if (res.status === 400) {
      console.log("Admin session verified (400 Bad Request is expected).");
      return;
    }

    // Any other unexpected error also means unauthorized
    if (!res.ok) {
      alert("Unauthorized access. Redirecting...");
      window.location.href = "../user-screens/map-screen.html";
      return;
    }

  } catch (err) {
    console.error("Session check error:", err);
    window.location.href = "../user-screens/map-screen.html";
  }
})();

const tableBody = document.querySelector("tbody");

const ongoingCountEl = document.querySelector(".OA");
const upcomingCountEl = document.querySelector(".UA");
const comingSoonCountEl = document.querySelector(".CSA");

const removeBtn = document.getElementById("remove-btn");
const confirmModal = document.getElementById("confirm-delete-modal");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const editBtn = document.querySelector(".edit button");
document.getElementById("seedBtn").addEventListener("click", seedEvents);

const publishBtn = document.getElementById("publish-btn");

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");

let selectedEventId = null;
let selectedRow = null;

let allEvents = [];

/* --------------------------- HELPERS --------------------------------- */

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
    const h = Math.floor(mins / 60).toString().padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    return `${h}:${m}`;
  };
  return `${toTime(start)}-${toTime(end)}`;
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

/* --------------------------- LOAD EVENTS --------------------------------- */

async function loadEvents() {
  try {
    selectedEventId = null;
    selectedRow = null;
    if (removeBtn) removeBtn.disabled = true;
    if (publishBtn) publishBtn.disabled = true;

    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const events = Object.entries(data).map(([id, event]) => ({
      id,
      ...event,
    }));

    allEvents = events;
    tableBody.innerHTML = "";

    if (publishBtn) {
      publishBtn.disabled = true;
      publishBtn.textContent = "Publish";
    }

    if (events.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 7; // 7 columns now (Select, No, Name, Held By, Time, Date, Status)
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

      // attach ID to row for delete/publish
      tr.dataset.eventId = event.id;

      // ========== kolom SELECT (checkbox) ==========
      const tdSelect = document.createElement("td");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.classList.add("row-select");
      tdSelect.appendChild(checkbox);

      // ========== kolom-kolom lama ==========
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

      // ========== kolom STATUS ==========
      const tdStatus = document.createElement("td");
      tdStatus.textContent = event.published ? "Published" : "Unpublished";

      tr.append(tdSelect, tdNo, tdName, tdHeldBy, tdTime, tdDate, tdStatus);
      tableBody.appendChild(tr);

      // helper: pilih row
      const selectRow = () => {
        selectedEventId = tr.dataset.eventId;

        document
          .querySelectorAll(".table tbody tr")
          .forEach((row) => row.classList.remove("selected"));
        document
          .querySelectorAll(".row-select")
          .forEach((cb) => (cb.checked = false));

        tr.classList.add("selected");
        checkbox.checked = true;
        selectedRow = tr;

        if (removeBtn) removeBtn.disabled = false;
        if (publishBtn) publishBtn.disabled = false;
      };

      tr.addEventListener("click", (e) => {
        if (e.target instanceof HTMLInputElement && e.target.type === "checkbox") {
          return;
        }
        selectRow();
      });

      checkbox.addEventListener("change", (e) => {
        if (checkbox.checked) {
          selectRow();
        } else {
          tr.classList.remove("selected");
          selectedEventId = null;
          selectedRow = null;
          if (removeBtn) removeBtn.disabled = true;
          if (publishBtn) publishBtn.disabled = true;
        }
        e.stopPropagation();
      });

      const status = getEventStatus(event);
      if (status === "Ongoing") ongoing++;
      else if (status === "Upcoming") upcoming++;
      else if (status === "Coming Soon") comingSoon++;
    });

    // update counter cards
    ongoingCountEl.textContent = ongoing;
    upcomingCountEl.textContent = upcoming;
    comingSoonCountEl.textContent = comingSoon;
  } catch (err) {
    console.error("Error loading events:", err);
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 7;
    td.textContent = "Failed to load events.";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tableBody.appendChild(tr);

    ongoingCountEl.textContent = 0;
    upcomingCountEl.textContent = 0;
    comingSoonCountEl.textContent = 0;
  }
}

/* --------------------------- SEARCH --------------------------------- */

function applySearchFilter() {
  const query = searchInput.value.trim().toLowerCase();

  if (query === "") {
    renderFilteredEvents(allEvents);
    return;
  }

  const filtered = allEvents.filter((ev) => {
    const name = ev.name ? ev.name.toLowerCase() : "";
    const held = ev.heldBy ? ev.heldBy.toLowerCase() : "";
    return name.includes(query) || held.includes(query);
  });

  renderFilteredEvents(filtered);
}

function renderFilteredEvents(list) {
  tableBody.innerHTML = "";

  if (list.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "No events found.";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tableBody.appendChild(tr);
    return;
  }

  list.forEach((event, index) => {
    const tr = document.createElement("tr");
    tr.dataset.eventId = event.id;

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${event.name}</td>
      <td>${event.heldBy}</td>
      <td>${formatTime(event.startTimeMinutes, event.endTimeMinutes)}</td>
      <td>${formatDate(event.date)}</td>
    `;

    /* ------------------ FIXED CLICK HANDLER IN SEARCH ------------------ */
    tr.addEventListener("click", () => {
      selectedEventId = tr.dataset.eventId;

      document
        .querySelectorAll(".table tbody tr")
        .forEach((r) => r.classList.remove("selected"));

      tr.classList.add("selected");
      selectedRow = tr;
      removeBtn.disabled = false;

      const selectedEvent = allEvents.find((e) => e.id === selectedEventId);
      if (selectedEvent) {
        publishBtn.disabled = false;
        publishBtn.textContent = selectedEvent.published
          ? "Published"
          : "Unpublished";
      } else {
        publishBtn.disabled = true;
        publishBtn.textContent = "Publish";
      }
    });
    /* -------------------------------------------------------------------- */

    tableBody.appendChild(tr);
  });
}

// I am trying to check the session of the dashboard using this code above
// but why is it that it kept on showing there is a session but when i tried to change anything it shows me 404 unauthorized

searchInput.addEventListener("input", applySearchFilter);
clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  applySearchFilter();
});

/* --------------------------- DELETE FLOW --------------------------------- */

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
    window.location.href = `add.html?id=${selectedEventId}`;
  });
}

if (cancelDeleteBtn) {
  cancelDeleteBtn.addEventListener("click", () => {
    confirmModal.classList.remove("show");
  });
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener("click", async () => {
    if (!selectedEventId) return;

    try {
      const res = await fetch(`${API_BASE}/events/${selectedEventId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to delete (HTTP ${res.status})`);
      }

      await loadEvents();
    } catch (err) {
      console.error(err);
      alert("Failed to delete event: " + err.message);
    } finally {
      confirmModal.classList.remove("show");
    }
  });
};

/* --------------------------- PUBLISH / UNPUBLISH --------------------------------- */

if (publishBtn) {
  publishBtn.addEventListener("click", async () => {
    if (!selectedEventId) {
      alert("Please select an event first.");
      return;
    }

    const currentEvent = allEvents.find((e) => e.id === selectedEventId);
    if (!currentEvent) {
      alert("Could not find selected event data.");
      return;
    }

    const newPublished = !currentEvent.published;

    try {
      publishBtn.disabled = true;

      const res = await fetch(`${API_BASE}/events/${selectedEventId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...currentEvent,
          published: newPublished,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Failed to update (HTTP ${res.status})`);
      }

      await loadEvents();
    } catch (err) {
      console.error(err);
      alert("Failed to update publish status: " + err.message);
    }
  });
}

/* --------------------------- SEED EVENTS --------------------------------- */

async function seedEvents() {
  if (!confirm("Seed 50 events into the database?")) return;

  try {
    const response = await fetch("./events_seed.json");
    const events = await response.json();

    if (!Array.isArray(events)) {
      throw new Error("events_seed.json did not return an array");
    }

    for (const event of events) {
      const res = await fetch(`${API_BASE}/events`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
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

/* --------------------------- INIT --------------------------------- */

window.addEventListener("DOMContentLoaded", loadEvents);
