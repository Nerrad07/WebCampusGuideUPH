const API_BASE = "https://web-campus-guide-uph.vercel.app";

const tableBody = document.querySelector("tbody");

const ongoingCountEl = document.querySelector(".OA");
const upcomingCountEl = document.querySelector(".UA");
const comingSoonCountEl = document.querySelector(".CSA");

const addBtn = document.getElementById("add-btn");
const removeBtn = document.getElementById("remove-btn");
const confirmModal = document.getElementById("confirm-delete-modal");
const cancelDeleteBtn = document.getElementById("cancel-delete-btn");
const confirmDeleteBtn = document.getElementById("confirm-delete-btn");
const editBtn = document.querySelector(".edit button");
document.getElementById("seedBtn").addEventListener("click", seedEvents);

const publishBtn = document.getElementById("publish-btn");

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");

let selectedEventIds = new Set();

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
        const h = Math.floor(mins / 60)
        .toString()
        .padStart(2, "0");
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

async function checkSession() {
  try {
    const res = await fetch(`${API_BASE}/admins`, {
      method: "GET",
      credentials: "include"
    });

    // 401 → no cookie = not logged in
    if (res.status === 401) return false;

    // 403 → has cookie but NOT an admin
    if (res.status === 403) return false;

    if (!res.ok) return false;

    // valid admin session
    const admin = await res.json();
    console.log("Dashboard: Admin authenticated:", admin.email);
    return true;

  } catch (err) {
    console.error("Dashboard checkSession error:", err);
    return false;
  }
}

async function loadEvents() {
    try {
        selectedEventIds.clear();
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
        const id = tr.dataset.eventId;

        const toggleRow = () => {
            if (selectedEventIds.has(id)) {
            selectedEventIds.delete(id);
            tr.classList.remove("selected");
            checkbox.checked = false;
            } else {
            selectedEventIds.add(id);
            tr.classList.add("selected");
            checkbox.checked = true;
            }

            const hasSelection = selectedEventIds.size > 0;
            if (removeBtn) removeBtn.disabled = !hasSelection;
            if (publishBtn) publishBtn.disabled = !hasSelection;
        };

        tr.addEventListener("click", (e) => {
            if (e.target === checkbox) return;
            toggleRow();
        });

        checkbox.addEventListener("change", (e) => {
            toggleRow();
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

// function renderFilteredEvents(list) {
//   tableBody.innerHTML = "";

//   if (list.length === 0) {
//     const tr = document.createElement("tr");
//     const td = document.createElement("td");
//     td.colSpan = 7;
//     td.textContent = "No events found.";
//     td.style.textAlign = "center";
//     tr.appendChild(td);
//     tableBody.appendChild(tr);
//     return;
//   }

//   list.forEach((event, index) => {
//     const tr = document.createElement("tr");
//     tr.dataset.eventId = event.id;

//     tr.innerHTML = `
//       <td>${index + 1}</td>
//       <td>${event.name}</td>
//       <td>${event.heldBy}</td>
//       <td>${formatTime(event.startTimeMinutes, event.endTimeMinutes)}</td>
//       <td>${formatDate(event.date)}</td>
//     `;

//     // const id = tr.dataset.eventId;

//     // const toggleRow = () => {
//     //   if (selectedEventIds.has(id)) {
//     //     selectedEventIds.delete(id);
//     //     tr.classList.remove("selected");
//     //     checkbox.checked = false;
//     //   } else {
//     //     selectedEventIds.add(id);
//     //     tr.classList.add("selected");
//     //     checkbox.checked = true;
//     //   }

//     //   const hasSelection = selectedEventIds.size > 0;
//     //   if (removeBtn) removeBtn.disabled = !hasSelection;
//     //   if (publishBtn) publishBtn.disabled = !hasSelection;
//     // };

//     // tr.addEventListener("click", (e) => {
//     //   if (e.target === checkbox) return;
//     //   toggleRow();
//     // });

//     // chckbox.addEventListener("change", (e) => {
//     //   toggleRow();
//     //   e.stopPropagation();
//     // });

//     tableBody.appendChild(tr);
//   });
// }

function renderFilteredEvents(list) {
    tableBody.innerHTML = "";

    if (list.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 7; // Select + No + Name + Held By + Time + Date + Status
        td.textContent = "No events found.";
        td.style.textAlign = "center";
        tr.appendChild(td);
        tableBody.appendChild(tr);
        return;
    }

    list.forEach((event, index) => {
        const tr = document.createElement("tr");
        tr.dataset.eventId = event.id;

        // checkbox column (same as in loadEvents)
        const tdSelect = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("row-select");
        tdSelect.appendChild(checkbox);

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

        const tdStatus = document.createElement("td");
        tdStatus.textContent = event.published ? "Published" : "Unpublished";

        tr.append(tdSelect, tdNo, tdName, tdHeldBy, tdTime, tdDate, tdStatus);
        tableBody.appendChild(tr);

        const id = tr.dataset.eventId;

        const toggleRow = () => {
        if (selectedEventIds.has(id)) {
            selectedEventIds.delete(id);
            tr.classList.remove("selected");
            checkbox.checked = false;
        } else {
            selectedEventIds.add(id);
            tr.classList.add("selected");
            checkbox.checked = true;
        }

        const hasSelection = selectedEventIds.size > 0;
        if (removeBtn) removeBtn.disabled = !hasSelection;
        if (publishBtn) publishBtn.disabled = !hasSelection;
        };

        tr.addEventListener("click", (e) => {
        if (e.target === checkbox) return;
        toggleRow();
        });

        checkbox.addEventListener("change", (e) => {
        toggleRow();
        e.stopPropagation();
        });
    });
}

searchInput.addEventListener("input", applySearchFilter);
clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    applySearchFilter();
});

/* --------------------------- DELETE FLOW --------------------------------- */

if (addBtn) {
    addBtn.addEventListener("click", () => {
        if (selectedEventIds.size > 0) {
        alert(
            "You cannot add a new event while one or more events are selected. Please clear the selection first."
        );
        return;
        }
        window.location.href = "add.html";
    });
}

if (removeBtn) {
    removeBtn.addEventListener("click", () => {
        if (selectedEventIds.size === 0) {
        alert("Please select at least one event to delete.");
        return;
        }
        confirmModal.classList.add("show");
    });
}

if (editBtn) {
    editBtn.addEventListener("click", () => {
        if (selectedEventIds.size !== 1) {
        alert("Please select exactly one event to edit.");
        return;
        }
        const [onlyId] = selectedEventIds;
        window.location.href = `add.html?id=${onlyId}`;
    });
}

if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
        confirmModal.classList.remove("show");
    });
}

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
        if (selectedEventIds.size === 0) return;

        const idsToDelete = Array.from(selectedEventIds);

        try {
        for (const id of idsToDelete) {
            const res = await fetch(`${API_BASE}/events/${id}`, {
            method: "DELETE",
            credentials: "include",
            });

            if (!res.ok) {
            const text = await res.text();
            console.error("Failed to delete ${id}", text);
            }
        }

        selectedEventIds.clear();
        await loadEvents();
        } catch (err) {
        console.error(err);
        alert("Failed to delete some events. See console for details.");
        } finally {
        confirmModal.classList.remove("show");
        }
    });
}
/* --------------------------- PUBLISH / UNPUBLISH --------------------------------- */

if (publishBtn) {
    publishBtn.addEventListener("click", async () => {
        if (selectedEventIds.size === 0) {
        alert("Please select at least one event");
        return;
        }

        const idsToToggle = Array.from(selectedEventIds);

        try {
        publishBtn.disabled = true;

        for (const id of idsToToggle) {
            const currentEvent = allEvents.find((e) => e.id === id);
            if (!currentEvent) continue;

            const newPublished = !currentEvent.published;

            const res = await fetch(`${API_BASE}/events/${id}`, {
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
            console.error("Failed to update ${id}:", text);
            }
        }

        await loadEvents();
        } catch (err) {
        console.error(err);
        alert("Failed to update publish status. See console for details.");
        } finally {
        publishBtn.disabled = false;
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

window.addEventListener("DOMContentLoaded", async () => {
  //  STRICT ADMIN VALIDATION USING /admins
  const isAdmin = await checkSession();

  if (!isAdmin) {
    alert("Unauthorized access. Redirecting...");
    window.location.href = "../user-screens/map-screen.html";
    return;
  }

  //  SESSION CONFIRMED → NOW SAFE TO LOAD DASHBOARD
  await loadEvents();
});
