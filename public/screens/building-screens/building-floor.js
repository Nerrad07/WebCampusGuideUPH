// building-floor.js — universal for B/C/D/F

const DATA = {
    B: {
        1: ["B101","B102","B103","B104","B105 - Lab Komputer","B106 - Lecture Hall","B107","B108","B109","B110"],
        2: ["B201","B202","B203","B204","B205","B206","B207","B208","B209","B210"],
        3: ["B301","B302","B303","B304","B341","B342","B343","B344","B345"],
        4: ["B401","B402","B403","B404","B405","B406","B407","B408"],
        5: ["B501","B502","B503","B504","B505","B506","B507","B508"],
        6: ["B601","B602","B603","B604","B605","B606","B607","B608"]
    },
    C: {
        1: ["C101 - Lobby","C102 - Helpdesk","C103 - Security Post","C104 - Chapel Foyer"],
        2: ["C201","C202","C203 - Reading Room","C204 - Archive"],
        3: ["C301 - Library Service","C302 - Study Room A","C303 - Study Room B","C304 - Seminar Room"],
        4: ["C401 - Rectorate","C402 - Meeting Room","C403","C404"],
        5: ["C501 - Administration","C502","C503","C504"],
        6: ["C601 - Auditorium Control","C602 - AV Room","C603"],
        7: ["C701 - Studio","C702","C703"]
    },
    D: {
        1: ["D101","D102","D103","D104 - Moot Court","D105"],
        2: ["D201","D202","D203","D204","D205 - Computer Lab"],
        3: ["D301","D302","D303 - Lecture Hall","D304","D305"],
        4: ["D401","D402 - Faculty Office","D403","D404"],
        5: ["D501 - Atrium","D502","D503","D504","D505"]
    },
    F: {
        1: ["F101 - Sports Hall","F102 - Locker","F103 - Physio Room","F104 - Office"],
        2: ["F201 - Classroom","F202 - Classroom","F203 - Seminar","F204 - Meeting"],
        3: ["F301 - Fitness Lab","F302 - Studio A","F303 - Studio B"]
    }
};

const $ = (s, r=document)=>r.querySelector(s);

const qs = new URLSearchParams(location.search);
const building = (qs.get("building") || "B").toUpperCase();
const floor = String(qs.get("floor") || "1");

$("#floorTitle").textContent = `Building ${building} — Floor ${floor}`;

const ul = $("#roomList");
ul.innerHTML = "";
(DATA[building]?.[floor] || ["No data"]).forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    ul.appendChild(li);
});

const imageElement = document.createElement("img");
imageElement.style.width = "100%";
imageElement.style.borderRadius = "12px";
imageElement.style.marginTop = "10px";

/* ---------------------------
   IMAGE FETCHING (UPDATED)
--------------------------- */

const API_BASE = "https://web-campus-guide-uph.vercel.app";


const prefixMap = {
    B: "bb",
    C: "bc",
    D: "bd",
    F: "bf"
};

const prefix = prefixMap[building];

async function loadMapImage() {
    if (!prefix || !DATA[building][floor]) {
        console.warn("Invalid building or floor");
        return;
    }

    const fileName = `${prefix}_f${floor}.jpg`;
    const storagePath = `maps/${building}/${fileName}`;

    try {
        const res = await fetch(
            `${API_BASE}/map-image?path=${encodeURIComponent(storagePath)}`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        if (!res.ok) {
            console.error("Failed to load map image");
            return;
        }

        const data = await res.json();
        imageElement.src = data.url;

    } catch (err) {
        console.error("Error fetching map image:", err);
    }
}

loadMapImage();

/* --------------------------------- */

document.querySelector(".panel").after(imageElement);
