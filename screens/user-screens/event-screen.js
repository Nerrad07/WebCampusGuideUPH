const API_BASE = "https://web-campus-guide-uph.vercel.app";
const eventsList = document.getElementById("eventsList");
const emptyState = document.getElementById("emptyState");
const template = document.getElementById("eventCardTmpl");
const todayLabel = document.getElementById("todayLabel");

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const buildingMenu = document.getElementById("buildingMenu");
const buildingValue = document.getElementById("buildingValue");
const statusMenu = document.getElementById("statusMenu");
const statusValue = document.getElementById("statusValue");
const fromDateInput = document.getElementById("fromDate");
const toDateInput = document.getElementById("toDate");
const clearDatesBtn = document.getElementById("clearDates");

fromDateInput.addEventListener("input", applyFilters);
toDateInput.addEventListener("input", applyFilters);

const modal = document.getElementById("eventModal");
const modalTitle = document.getElementById("eventModalTitle");
const modalPoster = document.getElementById("eventPoster");
const modalDesc = document.getElementById("eventDesc");
const modalBuilding = document.getElementById("eventBuilding");
const modalRoom = document.getElementById("eventRoom");
const modalDate = document.getElementById("eventDate");
const modalTime = document.getElementById("eventTime");
const modalStatus = document.getElementById("eventStatus");

let allEvents = [];

function formatDate(ms) {
  const d = new Date(ms);
  return d.toISOString().split("T")[0];
}

function formatTime(start, end) {
  const toTime = (mins) =>
    `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  return `${toTime(start)} – ${toTime(end)}`;
}

function getEventStatus(event) {
  const now = new Date();
  const eventDate = new Date(event.date);

  const daysDiff = Math.floor((eventDate - now) / (1000 * 60 * 60 * 24));
  const nowMins = now.getHours() * 60 + now.getMinutes();

  if (
    eventDate.toDateString() === now.toDateString() &&
    nowMins >= event.startTimeMinutes &&
    nowMins <= event.endTimeMinutes
  ) {
    return "Ongoing";
  }

  if (daysDiff >= 0 && daysDiff < 21) return "Upcoming";
  if (daysDiff >= 21) return "Coming Soon";

  return "Past";
}

function renderEvents(events) {
  eventsList.innerHTML = "";
  if (!events.length) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  for (const ev of events) {
    const status = getEventStatus(ev);
    if (status === "Past") continue;

    const node = template.content.cloneNode(true);
    node.querySelector(".event-title").textContent = ev.name || "Untitled Event";
    node.querySelector(".event-heldby").textContent = ev.heldBy || "Unknown";
    node.querySelector(".event-date").textContent = formatDate(ev.date);
    node.querySelector(".event-time").textContent = formatTime(
      ev.startTimeMinutes,
      ev.endTimeMinutes
    );
    node.querySelector(".event-room").textContent = ev.room || "-";

    const badge = node.querySelector(".badge.status");
    badge.textContent = status;
    badge.dataset.status = status;
    const btn = node.querySelector(".event-more");
    btn.addEventListener("click", () => openModal(ev, status));

    eventsList.appendChild(node);
  }
}

function openModal(event, status) {
  modalTitle.textContent = event.name;
  modalPoster.src = event.posterUrl || "../../img/default-poster.png";
  modalDesc.textContent = event.description || "No additional information available.";
  modalBuilding.textContent = event.building;
  modalRoom.textContent = event.room;
  modalDate.textContent = formatDate(event.date);
  modalTime.textContent = formatTime(event.startTimeMinutes, event.endTimeMinutes);
  modalStatus.textContent = status;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

document.querySelectorAll("[data-close-modal]").forEach((el) =>
  el.addEventListener("click", () => {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
  })
);

function normalizeDateInput(value) {
  if (!value) return null;
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map(Number);
  const d = new Date(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function applyFilters() {
  const q = searchInput.value.toLowerCase();
  const building = buildingValue.textContent;
  const status = statusValue.textContent;

  const fromDate = normalizeDateInput(fromDateInput.value);
  const toDate = normalizeDateInput(toDateInput.value);

  const filtered = allEvents.filter((ev) => {
    const evStatus = getEventStatus(ev);
    if (evStatus === "Past") return false;

    const matchesSearch =
      !q ||
      ev.name?.toLowerCase().includes(q) ||
      ev.room?.toLowerCase().includes(q) ||
      ev.building?.toLowerCase().includes(q);

    const matchesBuilding = building === "All" || ev.building === building;
    const matchesStatus = status === "All" || evStatus === status;

    const evDateMs = typeof ev.date === "number" ? ev.date : Number(ev.date);

    const eventDay = new Date(evDateMs);
    eventDay.setHours(0, 0, 0, 0);
    const eventTimeMs = eventDay.getTime();

    const matchesDate =
      (!fromDate || eventTimeMs >= fromDate) &&
      (!toDate || eventTimeMs <= toDate);

    console.log({
      fromDate,
      toDate,
      eventName: ev.name,
      eventDate: new Date(ev.date).toISOString().split("T")[0],
      result: matchesDate
    });

    return matchesSearch && matchesBuilding && matchesStatus && matchesDate;
  });

  renderEvents(filtered);
}

function setupDropdown(menu, valueEl) {
  const button = menu.previousElementSibling;
  button.addEventListener("click", () => {
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  });
  menu.querySelectorAll("li").forEach((li) =>
    li.addEventListener("click", () => {
      menu.querySelectorAll("li").forEach((l) => l.removeAttribute("aria-selected"));
      li.setAttribute("aria-selected", "true");
      valueEl.textContent = li.dataset.value;
      menu.style.display = "none";
      applyFilters();
    })
  );
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target) && e.target !== button) {
      menu.style.display = "none";
    }
  });
}


clearDatesBtn.addEventListener("click", () => {
  fromDateInput.value = "";
  toDateInput.value = "";
  applyFilters();
});


searchInput.addEventListener("input", applyFilters);
clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  applyFilters();
});


async function loadEvents() {
  try {
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error("Failed to fetch events");
    const data = await res.json();
    allEvents = Object.values(data);
    renderEvents(allEvents);
  } catch (err) {
    console.error("Error loading events:", err);
  }
}

setupDropdown(buildingMenu, buildingValue);
setupDropdown(statusMenu, statusValue);
todayLabel.textContent = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "short",
  day: "numeric",
});
loadEvents();
