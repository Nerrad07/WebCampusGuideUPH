// add.js
const API_BASE = "https://web-campus-guide-uph.vercel.app";

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
   BUILDINGS + FLOORS
---------------------------*/
const FLOORS_BY_BUILDING = {
  B: 6,
  C: 7,
  D: 5,
  F: 8,
  G: 0,
  H: 0
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
    <option value="G">Building G</option>
    <option value="H">Building H</option>
  `;
}

/* --------------------------
   FLOOR DROPDOWN
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
   ROOM DROPDOWN
---------------------------*/
function loadRoomOptions(presetRoom) {
  const building = document.getElementById("building").value;
  const floor = document.getElementById("floor").value;
  const roomSelect = document.getElementById("room");

  roomSelect.innerHTML = `<option value="">Select a Room</option>`;

  if (!building || !floor) return;

  const rooms = [];
  for (let i = 1; i <= 6; i++) {
    const roomNum = `${floor}${String(i).padStart(2, "0")}`;
    const fullRoom = `${building}${roomNum}`;
    rooms.push(fullRoom);

    const opt = document.createElement("option");
    opt.value = fullRoom;
    opt.textContent = fullRoom;
    roomSelect.appendChild(opt);
  }

  if (presetRoom && !rooms.includes(presetRoom)) {
    const extra = document.createElement("option");
    extra.value = presetRoom;
    extra.textContent = presetRoom;
    roomSelect.appendChild(extra);
  }

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
async function handleFormSubmit(e) {
  e.preventDefault();

  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("id");

  const name = document.getElementById("eventname").value.trim();
  const date = document.getElementById("eventdate").value;
  const starttime = document.getElementById("starttime").value;
  const endtime = document.getElementById("endtime").value;
  const building = document.getElementById("building").value;
  const floor = document.getElementById("floor").value;
  const room = document.getElementById("room").value;

  if (!name || !date || !starttime || !endtime || !building || !room) {
    alert("Please fill all required fields.");
    return;
  }

  const posterFile = document.getElementById("poster").files[0];
  let posterUrl = "https://placehold.co/640x480?text=Event";

  if (posterFile) {
    const formData = new FormData();
    formData.append("poster", posterFile);

    const uploadRes = await fetch(`${API_BASE}/uploadPoster/${eventId || "temp"}`, {
      method: "POST",
      credentials: "include",
      body: formData
    });

    if (!uploadRes.ok) throw new Error("Poster upload failed");

    const uploadData = await uploadRes.json();
    posterUrl = uploadData.url;
  }

  const eventData = {
    name,
    building,
    floor,
    room,
    heldBy: "Admin",
    date: toTimestamp(date),
    startTimeMinutes: toMinutes(starttime),
    endTimeMinutes: toMinutes(endtime),
    updatedAt: Date.now(),
    published: true,
    posterUrl
  };

  if (!eventId) eventData.createdAt = Date.now();

  try {
    const res = await fetch(
      `${API_BASE}/events${eventId ? `/${eventId}` : ""}`,   // <-- FIXED PATH
      {
        method: eventId ? "PUT" : "POST",
        credentials: "include",  // REQUIRED SESSION COOKIE
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData)
      }
    );

    if (!res.ok) throw new Error("Failed to save event");

    alert(eventId ? "Event updated successfully!" : "Event added successfully!");
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error("Error submitting form:", err);
    alert("Error submitting event. Check console for details.");
  }
}

/* --------------------------
   INIT
---------------------------*/
fixBuildingSelectValues();
document.getElementById("building").addEventListener("change", () => loadFloorOptions());
document.getElementById("floor").addEventListener("change", () => loadRoomOptions());
document.querySelector("form").addEventListener("submit", handleFormSubmit);
window.addEventListener("DOMContentLoaded", loadEventForEdit);
