// add.js
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

/* --------------------------
   TIME / DATE HELPERS
---------------------------*/
function toMinutes(timeStr) {
  if (!timeStr) return 0;
  const [hours, mins] = timeStr.split(":").map(Number);
  return hours * 60 + mins;
}

function toTimeString(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().split("T")[0];
}

function toTimestamp(dateStr) {
  return new Date(dateStr).getTime();
}

/* --------------------------
   BUILDINGS + FLOORS (FIXED)
---------------------------*/
const FLOORS_BY_BUILDING = {
  B: 6,
  C: 6,
  D: 5,
  F: 3
};

// EXACT ROOM LISTS (FIXED)
const ROOMS_BY_BUILDING = {
  B: {
    1: ["B101","B102","B103","B104","B105","B106","B107","B108","B109","B110"],
    2: ["B201","B202","B203","B204","B205","B206","B207","B208","B209","B210"],
    3: ["B301","B302","B303","B304","B341","B342","B343","B344","B345"],
    4: ["B401","B402","B403","B404","B405","B406","B407","B408"],
    5: ["B501","B502","B503","B504","B505","B506","B507","B508"],
    6: ["B601","B602","B603","B604","B605","B606","B607","B608"]
  },
  C: {
    1: ["C101","C102","C103","C104"],
    2: ["C201","C202","C203","C204"],
    3: ["C301","C302","C303","C304"],
    4: ["C401","C402","C403","C404"],
    5: ["C501","C502","C503","C504"],
    6: ["C601","C602","C603"]
  },
  D: {
    1: ["D101","D102","D103","D104","D105"],
    2: ["D201","D202","D203","D204","D205"],
    3: ["D301","D302","D303","D304","D305"],
    4: ["D401","D402","D403","D404"],
    5: ["D501","D502","D503","D504","D505"]
  },
  F: {
    1: ["F101","F102","F103","F104"],
    2: ["F201","F202","F203","F204"],
    3: ["F301","F302","F303"]
  }
};

/* --------------------------
   INITIALIZE BUILDING DROPDOWN
---------------------------*/
function fixBuildingSelectValues() {
  document.querySelector("#building").innerHTML = `
    <option value="">Select a Building</option>
    <option value="B">Building B</option>
    <option value="C">Building C</option>
    <option value="D">Building D</option>
    <option value="F">Building F</option>
  `;
}

/* --------------------------
   FLOOR DROPDOWN  (FIXED)
---------------------------*/
function loadFloorOptions(presetFloor) {
  const building = document.getElementById("building").value;
  const floorSelect = document.getElementById("floor");

  floorSelect.innerHTML = `<option value="">Select a Floor</option>`;

  const maxFloor = FLOORS_BY_BUILDING[building] || 0;

  for (let i = 1; i <= maxFloor; i++) {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = String(i);
    floorSelect.appendChild(opt);
  }

  if (presetFloor != null) floorSelect.value = String(presetFloor);

  loadRoomOptions();
}

/* --------------------------
   ROOM DROPDOWN (FIXED)
---------------------------*/
function loadRoomOptions(presetRoom) {
  const building = document.getElementById("building").value;
  const floor = Number(document.getElementById("floor").value);
  const roomSelect = document.getElementById("room");

  roomSelect.innerHTML = `<option value="">Select a Room</option>`;

  if (!building || !floor) return;

  const roomList = ROOMS_BY_BUILDING[building][floor] || [];

  roomList.forEach(room => {
    const opt = document.createElement("option");
    opt.value = room;
    opt.textContent = room;
    roomSelect.appendChild(opt);
  });

  if (presetRoom) roomSelect.value = presetRoom;
}

/* --------------------------
   LOAD EVENT FOR EDIT MODE
---------------------------*/
async function loadEventForEdit() {
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");
  if (!eventId) return;

  try {
    const res = await fetch(`${API_BASE}/events/${eventId}`);
    if (!res.ok) throw new Error("Failed to fetch event");
    const event = await res.json();

    document.getElementById("eventname").value = event.name || "";
    if (event.date)
      document.getElementById("eventdate").value = formatDate(event.date);
    if (event.heldBy)
      document.getElementById("held").value = event.heldBy;
    if (event.startTimeMinutes)
      document.getElementById("starttime").value = toTimeString(event.startTimeMinutes);
    if (event.endTimeMinutes)
      document.getElementById("endtime").value = toTimeString(event.endTimeMinutes);

    document.getElementById("building").value = event.building || "";
    loadFloorOptions(event.floor);
    loadRoomOptions(event.room);

  } catch (err) {
    console.error("Failed to fetch event:", err);
  }
}

/* --------------------------
   SUBMIT HANDLER
---------------------------*/
async function uploadPosterForEvent(eventId, file) {
    const formData = new FormData();
    formData.append("poster", file);

    const resp = await fetch(`${API_BASE}/uploadPoster/${eventId}`, {
        method: "POST",
        credentials: "include",
        body: formData
    });

    if (!resp.ok) throw new Error("Poster upload failed");

    return await resp.json();
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");

  const name = document.getElementById("eventname").value.trim();
  const heldBy = document.getElementById("held").value.trim();
  const date = document.getElementById("eventdate").value;
  const starttime = document.getElementById("starttime").value;
  const endtime = document.getElementById("endtime").value;
  const building = document.getElementById("building").value;
  const floor = document.getElementById("floor").value;
  const room = document.getElementById("room").value;

  if (!name || !heldBy || !date || !starttime || !endtime || !building || !room) {
    alert("Please fill all required fields.");
    return;
  }

  let finalEventId = eventId;
  let posterFile = document.getElementById("poster").files[0];

  // Create event 
  if (!finalEventId) {
    const eventData = {
      name,
      heldBy,
      building,
      floor,
      room,
      date: toTimestamp(date),
      startTimeMinutes: toMinutes(starttime),
      endTimeMinutes: toMinutes(endtime),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      published: true,
      posterUrl: ""
    };

    const createRes = await fetch(`${API_BASE}/events`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData)
    });

    if (!createRes.ok) {
      alert("Failed to create event.");
      return;
    }

    const newData = await createRes.json();
    finalEventId = newData.id;
  }

  let posterUrl = "";
  if (posterFile) {
    const uploadRes = await uploadPosterForEvent(finalEventId, posterFile);
    posterUrl = uploadRes.url;
  }

  const updateRes = await fetch(`${API_BASE}/events/${finalEventId}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      posterUrl,
      heldBy
    })
  });

  if (!updateRes.ok) {
    alert("Failed to update event with poster.");
    return;
  }

  alert("Event saved successfully!");
  window.location.href = "dashboard.html";
}


/* --------------------------
   INIT
---------------------------*/
fixBuildingSelectValues();
document.getElementById("building").addEventListener("change", () => loadFloorOptions());
document.getElementById("floor").addEventListener("change", () => loadRoomOptions());
document.querySelector("form").addEventListener("submit", handleFormSubmit);
window.addEventListener("DOMContentLoaded", loadEventForEdit);
