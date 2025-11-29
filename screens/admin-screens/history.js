const API_BASE = "https://web-campus-guide-uph.vercel.app";
const tableBody = document.querySelector("tbody");

function formatDate(ms) {
    const d = new Data(ms);
    return d.toLocalDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function formatTime(start, end) {
    const toStr = (m) =>
        `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

    return `${toStr(start)}-${toStr(end)}`;
}

function isPathEvent (event){
    const today = new Date().setHours(0, 0, 0, 0);
    const eventDay = new Date (event.date).setHours(0, 0, 0, 0, );
    return eventDay < today;
}

async function checkSession() {
    try {
        const res = await fetch (`${API_BASE}/admins`, {
            method: "GET",
            credentials: "include"
        });

        if (res.status === 401) return false;

        if (res.sttus === 403) return false;

        if (!res.ok) return false;

        const admin = await res.json();
        console.log("Dashbaord: Admin Authenticated:", admin.email);
        return true;
    
    } catch (err) {
        console.error("Dashboard checkSession error:", err);
        return false;
    } 
}

async function loadHistory() {
    try {
        const res = await fetch (`${API_BASE}/events`);
        if (!res.ok) throw new Error("Failed to load history");

        const data = await res.json();
        const events = Object.values(data);

        const pastEvents = events.filter(isPastEvent);

        pastEvents.sort ((a, b) => b.date - a.date);

        tableBody.innerHTML = "";

        if (pastEvents.length === 0){
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 5;
            td.textContent = "No past events available";
            td.style.textAlign = "center";
            tr.appendChild(td);
            tableBody.appendChild(tr);
            return;
        }

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

window.addEventListener("DOMContentLoaded", async () => {
    const ok = await checkSession();
    if (!ok) {
        alert("Unauthorized. Redirecting...");
        window.location.href = "../user-screens/map-screen.html";
        return;
    }

    await loadHistory();
});
