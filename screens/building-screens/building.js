// building.js — B-Building screen (faculties modal + building events)

// small dom helpers
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

// page context
const mainEl = $("main.page");
const BUILDING = (mainEl?.dataset.building || "B").toUpperCase();

// faculty data
const FACULTIES = {
    B: {
        fit:  { name: "Faculty of Information Technology", description: "for students in the field, to study logical thinking, software engineering & systems.", majors: ["Informatics", "Information Systems"] },
        fai:  { name: "Faculty of Artificial Intelligence", description: "for students in the field, to study artificial intelligence and applied machine learning.", majors: ["AI", "Data Science"] },
        fom:  { name: "Faculty of Music", description: "for students in the field, to study performance & music technology programs.", majors: ["Music Performance", "Sound Tracker"] },
        fast: { name: "Faculty of Science and Technology", description: "for students in the field, to study interdisciplinary science and tech collaboration.", majors: ["Biotechnology", "Applied Mathemathics", "Industrial Engineering", "Food Technology"] }
    },
    C: {
        lib:      { name: "Johannes Oentoro Library", description: "serves as campus library & study services. Available for every students and lecturers, must bring Identity Card!", majors: ["Library Services", "Research Support", "Information Literacy"] },
        chapel:   { name: "Grand Chapel", description: "serves as multi-purpose chapel & events. Every Wednesday morning, TC's chapel is held here!", majors: ["Music & Liturgy Team", "Event Stewardship", "UPH Awards", "Ambassador of UPH"]},
        registrar:{ name: "Registration Office", description: "serves as admissions & records center, to register as student in the uni.", majors: ["Admissions Service", "Records Management", "Registration Service"] },
        rector:   { name: "Rectorate Office", description: "serves as a private office for uiversity leadership entities, for reputable people.", majors: ["Rectorate", "Public Relations"] }
    },
    D: {
        fht:  { name: "Faculty of Hospitality and Tourism", description: "for students in the field, to study hospitality and tourism, which focuses on cooking, serving, etc.", majors: ["Chef", "Baker", "Drink Master"] },
    },
    F: {
        law:  { name: "Faculty of Law", description: "for students in the field, to study legal studies & clinics.", majors: ["Private Law", "Criminal Law", "International Law"] },
        fisip:{ name: "Faculty of Social & Political Sciences", description: "for students in the field, to study communication & governance.", majors: ["Communication", "International Relations", "Public Administration"] }
    }
};

/* ------------------------------------------------------------------
   EVENTS MODULE
   Uses the SAME data shape as event-screen (title, heldBy, building,
   room, date, timeStart, timeEnd, status) agar konsisten
------------------------------------------------------------------- */

// nanti akan di replace dengan Firebase read
async function fetchEventsShared() {
    return [
        { id:"e1", title:"Masterclass",     heldBy:"SDAE UPH",           building:"B", room:"B508",     date:"2025-10-17", timeStart:"14:00", timeEnd:"15:30", status:"Upcoming" },
        { id:"e2", title:"Career Talk",     heldBy:"CDC UPH",            building:"C", room:"C201",     date:"2025-10-16", timeStart:"09:00", timeEnd:"11:00", status:"Ongoing"  },
        { id:"e3", title:"Innovation Expo", heldBy:"Faculty of Science", building:"D", room:"D-Atrium", date:"2025-10-23", timeStart:"10:00", timeEnd:"17:00", status:"Coming Soon" },
        { id:"e4", title:"UI/UX Workshop",  heldBy:"HMIF",               building:"B", room:"B341",     date:"2025-10-11", timeStart:"13:00", timeEnd:"16:00", status:"Ongoing"  },
        { id:"e5", title:"Music Ensemble",  heldBy:"Conservatory",       building:"B", room:"B101",     date:"2025-10-16", timeStart:"18:00", timeEnd:"19:30", status:"Upcoming" }
    ];
}

const bEventsUI = {
    list: $("#bEventsList"),
    empty: $("#bEmptyState"),
    tmpl: $("#bEventCardTmpl"),

    render(events) {
        this.list.innerHTML = "";

        if (!events.length){
            this.empty.hidden = false;
            return;
        }
        this.empty.hidden = true;

        for (const ev of events){
            const node = this.tmpl.content.cloneNode(true);

            $(".event-title", node).textContent = ev.title;
            $(".event-heldby", node).textContent = ev.heldBy;
            $(".event-date", node).textContent   = ev.date;
            $(".event-time", node).textContent   = `${ev.timeStart} – ${ev.timeEnd}`;
            $(".event-room", node).textContent   = ev.room;

            const badge = $(".badge.status", node);
            badge.textContent   = ev.status;
            badge.dataset.status = ev.status;

            this.list.appendChild(node);
        }
    }
};

// events UI (selectors are generic with fallbacks)
const eventsList = $("#eventsList") || $("#bEventsList") || $("#cEventsList") || $("#dEventsList") || $("#fEventsList");
const eventTmpl  = $("#eventCardTmpl") || $("#bEventCardTmpl") || $("#cEventCardTmpl") || $("#dEventCardTmpl") || $("#fEventCardTmpl");
const emptyState = $("#emptyState") || $("#bEmptyState") || $("#cEmptyState") || $("#dEmptyState") || $("#fEmptyState");

function renderEvents(rows = [])  {
    if (!eventsList || !eventTmpl) return;
    eventsList.innerHTML = "";

    if (!rows.length) { 
        if (emptyState) emptyState.hidden = false; return; 
    }

    if (emptyState) emptyState.hidden = true;

    for (const ev of rows) {
        const node = eventTmpl.content.cloneNode(true);

        $(".event-title", node).textContent = ev.title;
        $(".event-heldby", node).textContent = ev.heldBy;
        $(".event-date", node).textContent   = ev.date;
        $(".event-time", node).textContent   = `${ev.timeStart} – ${ev.timeEnd}`;
        $(".event-room", node).textContent   = ev.room;

        const badge = $(".badge.status", node);

        if (badge) { 
            badge.textContent = ev.status; badge.dataset.status = ev.status; 
        }
        eventsList.appendChild(node);
    }
}

// modal
const modal = {
    root:  $("#facultyModal"),
    title: $("#modalTitle"),
    desc:  $(".modal_desc"),
    list:  $("#modalMajors"),

    open(payload) {
        if (!this.root) return;

        this.title.textContent = payload.name;
        this.desc.textContent  = `${payload.name} is a facility that ${payload.description.toLowerCase()}`;
        this.list.innerHTML = "";

        payload.majors.forEach(m => { 
            const li = document.createElement("li"); li.textContent = m; this.list.appendChild(li); 
        });
        this.root.classList.add("is-open");
        this.root.setAttribute("aria-hidden","false");
        document.body.style.overflow = "hidden";
    },

    close() {
        if (!this.root) return;
        this.root.classList.remove("is-open");
        this.root.setAttribute("aria-hidden","true");
        document.body.style.overflow = "";
    },

    bind() {
        this.root?.addEventListener("click", e => { 
            if (e.target.matches("[data-close-modal]")) this.close(); 
        });
        document.addEventListener("keydown", e => { 
            if (e.key === "Escape" && this.root?.classList.contains("is-open")) this.close(); 
        });
    }
};

// faculty cards
function bindFacultyCards() {
    const map = FACULTIES[BUILDING] || {};
    $$(".faculty-card").forEach(btn => {
            btn.addEventListener("click", () => {
                const key  = btn.getAttribute("data-faculty");
                const data = map[key];
                if (data) modal.open(data);
            });
    });
}

// initial 
(async function init() {
    modal.bind();
    bindFacultyCards();

    const all = await fetchEventsShared();
    renderEvents(all.filter(e => e.building === BUILDING));
})();