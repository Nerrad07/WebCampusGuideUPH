const API_BASE = "https://web-campus-guide-uph.vercel.app";
const tableBody = document.querySelector("tbody");

const ongoingCountEl = document.querySelector(".OA");
const upcomingCountEl = document.querySelector(".UA");
const comingSoonCountEl = document.querySelector(".CSA");

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
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const events = Object.values(data);

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

window.addEventListener("DOMContentLoaded", loadEvents);
