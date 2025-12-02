// add.js
const API_BASE = "https://web-campus-guide-uph.vercel.app";

let CURRENT_ADMIN_UID = "unkown-admin"

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
   POSTER UPLOAD
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

async function checkRoomConflict(dateTimestamp, room, startMins, endMins) {
    try {
        const url = `${API_BASE}/checkRoomConflict?date=${dateTimestamp}&room=${encodeURIComponent(room)}`;
        console.log(url)
        const res = await fetch(url, {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) {
            console.warn("Room conflict check failed");
            return true;
        }

        const events = await res.json();

        console.log("Events returned by /checkRoomConflict:", events);

        if (!Array.isArray(events) || events.length === 0) {
            return true;
        }

        for (const ev of events) {
            const evStart = ev.startTimeMinutes;
            const evEnd = ev.endTimeMinutes;

            const overlap = startMins < evEnd && evStart < endMins;

            if (overlap) {
                const startStr = toTimeString(evStart);
                const endStr = toTimeString(evEnd);

                alert(
                    `Room Conflict:\n\n` +
                    `"${ev.name}" is already using this room.\n` +
                    `Occupied from ${startStr} to ${endStr}.`
                );

                return false;
            }
        }

        return true;

    } catch (err) {
        console.error("Error checking room conflict:", err);
        return true; 
    }
}


/* --------------------------
   FORM SUBMIT HANDLER
---------------------------*/
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
    const startMins = toMinutes(starttime);
    const endMins = toMinutes(endtime);
    const eventDateMs = toTimestamp(date);
    const todayMs = new Date();
    todayMs.setHours(0, 0, 0, 0);

    const dateTimestamp = new Date(date).getTime();

    const conflictFree = await checkRoomConflict(
        dateTimestamp,
        room,
        startMins,
        endMins
    );

    if (!conflictFree) return;

    if (eventDateMs < todayMs.getTime()) {
      alert("Event date cannot be in the past.");
      return;
    }

    if (startMins >= endMins) {
      alert("Start time must be earlier than end time.");
      return;
    }

    if (!name || !heldBy || !date || !starttime || !endtime || !building || !room) {
        alert("Please fill all required fields.");
        return;
    }

    let finalEventId = eventId;
    const posterInput = document.getElementById("poster");
    let posterFile = posterInput.files[0];

    // ===== Poster validation: type + extension + max 5MB =====
    if (posterFile) {
        const maxSize = 5 * 1024 * 1024; // 5 MB
        const allowedExts  = ["jpg", "jpeg", "png"];
        const allowedTypes = ["image/jpeg", "image/png"];

        const fileName = posterFile.name || "";
        const ext = fileName.split(".").pop().toLowerCase();

        const isExtOk  = allowedExts.includes(ext);
        const isTypeOk = allowedTypes.includes(posterFile.type);

        if (!isExtOk || !isTypeOk) {
            alert("Poster must be JPG, JPEG, or PNG.");
            posterInput.value = "";      // clear so user can re-upload
            return;
        }

        if (posterFile.size > maxSize) {
            alert("Please re-upload file with max 5MB.");
            posterInput.value = "";      // clear so user can re-upload
            return;
        }
    }

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
            createdBy: CURRENT_ADMIN_UID,
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

        try {
            const dateTimestamp = toTimestamp(date);

            const addDateRes = await fetch(`${API_BASE}/eventsByDate`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    eventId: finalEventId,
                    dateTimestamp
                })
            });

            if (!addDateRes.ok) {
                console.error("Failed to add event to eventsByDate");
                alert("Event was created, but failed to update the date index.");
            }
        } catch (err) {
            console.error("Error calling /eventsByDate:", err);
        }
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
   ADMIN AUTH CHECK
---------------------------*/
async function checkAdminSession() {
    try {
        const res = await fetch(`${API_BASE}/admins`, {
        method: "GET",
        credentials: "include"
        });

        if (res.status === 401) return false;
        if (res.status === 403) return false;
        if (!res.ok) return false;

        const admin = await res.json();
        console.log("Add Event: Admin authenticated:", admin.email);
        CURRENT_ADMIN_UID = admin.uid;
        return true;

    } catch (err) {
        console.error("AddEvent checkAdminSession error:", err);
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

            // optional logout hit
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


window.addEventListener("DOMContentLoaded", async () => {
    const isAdmin = await checkAdminSession();

    if (!isAdmin) {
        alert("Unauthorized access. Redirecting...");
        window.location.href = "../user-screens/map-screen.html";
        return;
    }

    fixBuildingSelectValues();
    document.getElementById("building").addEventListener("change", () => loadFloorOptions());
    document.getElementById("floor").addEventListener("change", () => loadRoomOptions());
    document.querySelector("form").addEventListener("submit", handleFormSubmit);

    await loadEventForEdit();
    attachLeaveAdminConfirm();
});
