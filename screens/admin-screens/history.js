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

// Format timestamp → readable date
function formatDate(ms) {
  const d = new Date(ms);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Convert minutes to HH:MM
function formatTime(start, end) {
  const toStr = (m) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  return `${toStr(start)}–${toStr(end)}`;
}

// Detect Past event
function isPastEvent(event) {
  const today = new Date().setHours(0, 0, 0, 0);
  const eventDay = new Date(event.date).setHours(0, 0, 0, 0);
  return eventDay < today;
}

async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error("Failed to load history");

    const data = await res.json();
    const events = Object.values(data);

    // ⭐ Only show Past events
    const pastEvents = events.filter(isPastEvent);

    // ⭐ Sort newest → oldest
    pastEvents.sort((a, b) => b.date - a.date);

    tableBody.innerHTML = "";

    if (pastEvents.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = 5;
      td.textContent = "No past events available.";
      td.style.textAlign = "center";
      tr.appendChild(td);
      tableBody.appendChild(tr);
      return;
    }

    // Render list
    pastEvents.forEach((event, index) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${event.name || "-"}</td>
        <td>${event.heldBy || "-"}</td>
        <td>${formatTime(event.startTimeMinutes, event.endTimeMinutes)}</td>
        <td>${formatDate(event.date)}</td>
      `;

      tableBody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);

    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Error loading event history.";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tableBody.appendChild(tr);
  }
}

// Load when page opens
window.addEventListener("DOMContentLoaded", loadHistory);
