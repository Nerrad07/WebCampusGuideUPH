// event-screen.js yang bwt front-end, bersifat modular and Firebase-ready later

const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
    building: "All",
    status:   "All",
    from:     null,   // yyyy-mm-dd
    to:       null,   // yyyy-mm-dd
    query:    "",     // search text
    events:   [],    
}

const ui = {
    todayLabel: $("#todayLabel"),
    
    buildingBtn:  $("#buildingBtn"),
    buildingValue:$("#buildingValue"),
    buildingMenu: $("#buildingMenu"),

    statusBtn:    $("#statusBtn"),
    statusValue:  $("#statusValue"),
    statusMenu:   $("#statusMenu"),

    fromDate:     $("#fromDate"),
    toDate:       $("#toDate"),
    clearDates:   $("#clearDates"),

    searchForm:    $("#searchForm"),
    searchInput:   $("#searchInput"),
    clearSearch:   $("#clearSearch"),

    list:         $("#eventsList"),
    empty:        $("#emptyState"),

    cardTmpl:     $("#eventCardTmpl"),
}

// Data layer - soon direplace sama firebase
async function fetchEventsMock() {
    return [
        {
            id: "e1",
            title: "Masterclass",
            heldBy: "SDAE UPH",
            building: "B",
            room: "B508",
            date: "2025-10-17",
            timeStart: "14:00",
            timeEnd: "15:30",
            status: "Upcoming",
        },
        {
            id: "e2",
            title: "Career Talk",
            heldBy: "CDC UPH",
            building: "C",
            room: "C201",
            date: "2025-10-16",
            timeStart: "09:00",
            timeEnd: "11:00",
            status: "Ongoing",
        },
        {
            id: "e3",
            title: "Innovation Expo",
            heldBy: "Faculty of Science",
            building: "D",
            room: "D-Atrium",
            date: "2025-10-23",
            timeStart: "10:00",
            timeEnd: "17:00",
            status: "Coming Soon",
        },
        {
            id: "e4",
            title: "UI/UX Workshop",
            heldBy: "HMIF",
            building: "B",
            room: "B341",
            date: "2025-10-11",
            timeStart: "13:00",
            timeEnd: "16:00",
            status: "Ongoing",
        },
        {
            id: "e5",
            title: "Music Ensemble",
            heldBy: "Conservatory",
            building: "B",
            room: "B101",
            date: "2025-10-16",
            timeStart: "18:00",
            timeEnd: "19:30",
            status: "Upcoming",
        },
    ];
}


// Utilities
function fmtDateLabel(iso) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
}

function withinRange(isoDate, from, to) {
    if (!from && !to) return true;
    if (from && isoDate < from) return false;
    if (to   && isoDate > to)   return false;
    return true;
}

function matchesQuery(ev, query) {
    // empty query => always match
    if (!query) return true;

    const q = query.trim().toLowerCase();
    if (!q) return true;

    // token-based: every token must be found somewhere
    const tokens = q.split(/\s+/);

    const haystack = [
        ev.title, ev.heldBy, ev.building, ev.room,
        ev.status, ev.date, ev.timeStart, ev.timeEnd
    ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

    return tokens.every(t => haystack.includes(t));
}

// render
function render(events) {
    ui.list.innerHTML = "";

    if (!events.length) {
        ui.empty.hidden = false;
        return;
    }
    ui.empty.hidden = true;

    for (const ev of events) {
        const node = ui.cardTmpl.content.cloneNode(true);

        $(".event-title", node).textContent = ev.title;
        $(".event-heldby", node).textContent = ev.heldBy;
        $(".event-date", node).textContent   = ev.date;
        $(".event-time", node).textContent   = `${ev.timeStart} – ${ev.timeEnd}`;
        $(".event-room", node).textContent   = ev.room;

        const badge = $(".badge.status", node);
        badge.textContent = ev.status;
        badge.dataset.status = ev.status;

        ui.list.appendChild(node);
    }
}

function applyFilters() {
    const { building, status, from, to, query, events } = state;

    const filtered = events.filter(ev => {
        const byBuilding = building === "All" || ev.building === building;
        const byStatus   = status   === "All" || ev.status   === status;
        const byDate     = withinRange(ev.date, from, to);
        const bySearch   = matchesQuery(ev, query);
        return byBuilding && byStatus && byDate && bySearch;
    });

    render(filtered);
}


// Dropdowns
function openMenu(btn, menu) {
    closeAllMenus();
    btn.setAttribute("aria-expanded", "true");
    menu.style.display = "block";

    const first = menu.querySelector('[aria-selected="true"]') || menu.querySelector("li");
    if (first && first.focus) first.focus();
}

function closeMenu(btn, menu) {
    btn.setAttribute("aria-expanded", "false");
    menu.style.display = "none";
}

function closeAllMenus() {
    closeMenu(ui.buildingBtn, ui.buildingMenu);
    closeMenu(ui.statusBtn,   ui.statusMenu);
}

function setupDropdown(button, menu, onChoose) {
    button.addEventListener("click", (e) => {
        const expanded = button.getAttribute("aria-expanded") === "true";
        expanded ? closeMenu(button, menu) : openMenu(button, menu);
        e.stopPropagation();
    });

    menu.addEventListener("click", (e) => {
        const li = e.target.closest("li[role='option']");
        if (!li) return;

        $$("#" + menu.id + " li").forEach(el => el.setAttribute("aria-selected", "false"));
        li.setAttribute("aria-selected", "true");

        onChoose(li.dataset.value, li);
        closeMenu(button, menu);
    });

    menu.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeMenu(button, menu);
            button.focus();
        }
    });
}

// Initial (pas di awal)
async function init() {
    const todayIso = new Date().toISOString().slice(0, 10);
    ui.todayLabel.textContent = todayIso;

    // initial pengguna bisa lihat all events, no filters
    state.events = await fetchEventsMock();
    applyFilters();

    // building sort dropdown
    setupDropdown(ui.buildingBtn, ui.buildingMenu, (val) => {
        state.building = val;
        ui.buildingValue.textContent = val;
        applyFilters();
    });

    // status sort dropdown
    setupDropdown(ui.statusBtn, ui.statusMenu, (val) => {
        state.status = val;
        ui.statusValue.textContent = val;
        applyFilters();
    });

    // date range choice
    ui.fromDate.addEventListener("change", () => {
        state.from = ui.fromDate.value || null;
        applyFilters();
    });

    ui.toDate.addEventListener("change", () => {
        state.to = ui.toDate.value || null;
        applyFilters();
    });

    $("#clearDates").addEventListener("click", () => {
        ui.fromDate.value = "";
        ui.toDate.value   = "";
        state.from = null;
        state.to   = null;
        applyFilters();
    });

  // search
    if (ui.searchForm) {
        ui.searchForm.addEventListener("submit", (e) => e.preventDefault()); 
    }

    if (ui.searchInput) {
        ui.searchInput.addEventListener("input", () => {
            state.query = ui.searchInput.value;
            applyFilters();
        });

        ui.searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            ui.searchInput.value = "";
            state.query = "";
            applyFilters();
        }
        });
    }

    if (ui.clearSearch) {
        ui.clearSearch.addEventListener("click", () => {
            ui.searchInput.value = "";
            state.query = "";
            applyFilters();
            ui.searchInput.focus();
        });
    }

    // close menus dengan outside click
    document.addEventListener("click", closeAllMenus);
}

// Notes untuk Firebase wiring nantinya:
// Replace fetchEventsMock() dengan DB.readOnce("/events") atau DB.subscribe("/events", cb)
// Expected event shape:
// { id, title, heldBy, building, room, date:'YYYY-MM-DD', timeStart:'HH:mm', timeEnd:'HH:mm', status:'Ongoing|Upcoming|Coming Soon' }

init();