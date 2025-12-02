const API_BASE = "https://web-campus-guide-uph.vercel.app";
const tableBody = document.querySelector("tbody");

const prevPageBtn = document.getElementById("prevPage");
const nextPageBtn = document.getElementById("nextPage");
const pageIndicator = document.getElementById("pageIndicator");

let allPastEvents = [];
let currentPage = 1;
const itemsPerPage = 20;

function formatDate(ms) {
    const d = new Date(ms);
    return d.toLocaleDateString("en-US", {
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

function isPastEvent(event) {
    const today = new Date().setHours(0, 0, 0, 0);
    const eventDay = new Date(event.date).setHours(0, 0, 0, 0);
    return eventDay < today;
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
        console.log("Dashboard: Admin Authenticated:", admin.email);
        return true;
    } catch (err) {
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

    const totalPages = Math.ceil(allPastEvents.length / itemsPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageSlice = allPastEvents.slice(start, end);

    if (pageSlice.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = "No past events available";
        td.style.textAlign = "center";
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }

    pageSlice.forEach((event, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${start + index + 1}</td>
            <td>${event.name || "-"}</td>
            <td>${event.heldBy || "-"}</td>
            <td>${formatTime(event.startTimeMinutes, event.endTimeMinutes)}</td>
            <td>${formatDate(event.date)}</td>
        `;
        tableBody.appendChild(tr);
    });

    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;

    pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
}

async function loadHistory() {
    try {
        const res = await fetch(`${API_BASE}/events`);
        if (!res.ok) throw new Error("Failed to load history");

        const data = await res.json();
        const events = Object.values(data);

        allPastEvents = events.filter(isPastEvent);
        allPastEvents.sort((a, b) => b.date - a.date);

        currentPage = 1;
        renderPage();

    } catch (err) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = "Error loading event history.";
        td.style.textAlign = "center";
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }
}

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

window.addEventListener("DOMContentLoaded", async () => {
    const ok = await checkSession();
    if (!ok) {
        alert("Unauthorized. Redirecting...");
        window.location.href = "../user-screens/map-screen.html";
        return;
    }
    attachLeaveAdminConfirm();
    await loadHistory();
});

