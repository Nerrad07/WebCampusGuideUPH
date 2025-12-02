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

const publishBtn = document.getElementById("publish-btn");

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");

const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageIndicator = document.getElementById("pageIndicator");

let selectedEventIds = new Set();
let allEvents = [];
let filteredEvents = [];
let currentPage = 1;
const itemsPerPage = 20;

function formatDate(ms) {
    const d = new Date(ms);
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
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
    ) return "Ongoing";

    if (diffDays > 0 && diffDays < 30) return "Upcoming";
    if (diffDays >= 30) return "Coming Soon";
    if (diffDays < 0) return "Past";
    return "Unknown";
}

async function checkSession() {
    try {
        const res = await fetch(`${API_BASE}/admins`, {
            method: "GET",
            credentials: "include"
        });
        if (res.status === 401) return false;
        if (res.status === 403) return false;
        if (!res.ok) return false;
        const admin = await res.json();
        console.log("Dashboard: Admin authenticated:", admin.email);
        return true;
    } catch {
        return false;
    }
}

function attachLeaveAdminConfirm() {
    const mapLink   = document.querySelector(".mapwhite a");
    const eventLink = document.querySelector(".eventwhite a");

    const links = [mapLink, eventLink].filter(Boolean);

    links.forEach(link => {
        link.addEventListener("click", async (e) => {
            e.preventDefault();

            const ok = confirm(
                "You are currently logged in as admin. Going to the user screen will log you out. Continue?"
            );

            if (!ok) return;

            try {
                await fetch(`${API_BASE}/logout`, {
                    method: "POST",
                    credentials: "include"
                });
            } catch (err) {
                console.error("Logout request failed, redirecting anyway:", err);
            }

            window.location.href = link.href;
        });
    });
}


function renderPage() {
    tableBody.innerHTML = "";
    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageSlice = filteredEvents.slice(start, end);

    if (pageSlice.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 7;
        td.textContent = "No events found.";
        td.style.textAlign = "center";
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }

    pageSlice.forEach((event, index) => {
        const tr = document.createElement("tr");
        tr.dataset.eventId = event.id;

        const tdSelect = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.classList.add("row-select");
        tdSelect.appendChild(checkbox);

        const tdNo = document.createElement("td");
        tdNo.textContent = start + index + 1;

        const tdName = document.createElement("td");
        tdName.textContent = event.name || "-";

        const tdHeldBy = document.createElement("td");
        tdHeldBy.textContent = event.heldBy || "Unknown";

        const tdTime = document.createElement("td");
        tdTime.textContent = formatTime(event.startTimeMinutes, event.endTimeMinutes);

        const tdDate = document.createElement("td");
        tdDate.textContent = formatDate(event.date);

        const tdStatus = document.createElement("td");
        tdStatus.textContent = event.published ? "Published" : "Unpublished";

        tr.append(tdSelect, tdNo, tdName, tdHeldBy, tdTime, tdDate, tdStatus);

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
            removeBtn.disabled = !hasSelection;
            publishBtn.disabled = !hasSelection;
        };

        tr.addEventListener("click", (e) => {
            if (e.target === checkbox) return;
            toggleRow();
        });

        checkbox.addEventListener("change", (e) => {
            toggleRow();
            e.stopPropagation();
        });

        tableBody.appendChild(tr);
    });

    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
}

async function loadEvents() {
    try {
        selectedEventIds.clear();
        removeBtn.disabled = true;
        publishBtn.disabled = true;

        const res = await fetch(`${API_BASE}/events`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        const events = Object.entries(data)
        .map(([id, event]) => ({ id, ...event }))
        .filter(ev => getEventStatus(ev) !== "Past");

        allEvents = events;
        allEvents.sort((a, b) => a.date - b.date);

        let ongoing = 0;
        let upcoming = 0;
        let comingSoon = 0;

        allEvents.forEach(ev => {
            const s = getEventStatus(ev);
            if (s === "Ongoing") ongoing++;
            else if (s === "Upcoming") upcoming++;
            else if (s === "Coming Soon") comingSoon++;
        });

        ongoingCountEl.textContent = ongoing;
        upcomingCountEl.textContent = upcoming;
        comingSoonCountEl.textContent = comingSoon;

        filteredEvents = [...allEvents];
        currentPage = 1;
        renderPage();
    } catch {
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

function applySearchFilter() {
    const query = searchInput.value.trim().toLowerCase();

    if (query === "") {
        filteredEvents = [...allEvents];
    } else {
        filteredEvents = allEvents.filter(ev => {
            const n = ev.name?.toLowerCase() || "";
            const h = ev.heldBy?.toLowerCase() || "";
            return n.includes(query) || h.includes(query);
        });
    }

    currentPage = 1;
    renderPage();
}

searchInput.addEventListener("input", applySearchFilter);
clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    applySearchFilter();
});

prevPageBtn.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        renderPage();
    }
});

nextPageBtn.addEventListener("click", () => {
    currentPage++;
    renderPage();
});

if (addBtn) {
    addBtn.addEventListener("click", () => {
        if (selectedEventIds.size > 0) {
            alert("You cannot add a new event while events are selected.");
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

        const ids = Array.from(selectedEventIds);

        try {
            for (const id of ids) {
                const res = await fetch(`${API_BASE}/events/${id}`, {
                    method: "DELETE",
                    credentials: "include"
                });
            }
            selectedEventIds.clear();
            await loadEvents();
        } finally {
            confirmModal.classList.remove("show");
        }
    });
}

if (publishBtn) {
    publishBtn.addEventListener("click", async () => {
        if (selectedEventIds.size === 0) {
            alert("Please select at least one event");
            return;
        }

        const ids = Array.from(selectedEventIds);

        try {
            publishBtn.disabled = true;

            for (const id of ids) {
                const currentEvent = allEvents.find((e) => e.id === id);
                if (!currentEvent) continue;

                const newPublished = !currentEvent.published;

                await fetch(`${API_BASE}/events/${id}`, {
                    method: "PUT",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        ...currentEvent,
                        published: newPublished
                    })
                });
            }

            await loadEvents();
        } finally {
            publishBtn.disabled = false;
        }
    });
}

window.addEventListener("DOMContentLoaded", async () => {
    const isAdmin = await checkSession();
    if (!isAdmin) {
        alert("Unauthorized access. Redirecting...");
        window.location.href = "../user-screens/map-screen.html";
        return;
    }
    await loadEvents();
    attachLeaveAdminConfirm();
});
