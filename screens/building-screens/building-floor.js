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

// --- AUTO-DETECT BUILDING & FLOOR FROM URL ---
const qs = new URLSearchParams(location.search);
const building = (qs.get("building") || "B").toUpperCase();
const floor = String(qs.get("floor") || "1");

// Update title
$("#floorTitle").textContent = `Building ${building} — Floor ${floor}`;

// --- ROOM GRID LOADING ---
const ul = $("#roomList");
ul.innerHTML = "";
(DATA[building]?.[floor] || ["No data"]).forEach(name => {
    const li = document.createElement("li");
    li.textContent = name;
    ul.appendChild(li);
});

// --- SHOW MAP IMAGE FOR THIS BUILDING & FLOOR ---
const imageElement = document.createElement("img");
imageElement.style.width = "100%";
imageElement.style.borderRadius = "12px";
imageElement.style.marginTop = "10px";

// Firebase Storage bucket (correct)
const BUCKET = "campus-guide-map-uph.firebasestorage.app";

// prefix mapping
const prefixMap = {
    B: "bb",
    C: "bc",
    D: "bd",
    F: "bf"
};

const prefix = prefixMap[building];

// Only load if that floor truly exists in DATA
if (prefix && DATA[building][floor]) {

    // File name (example: bb_f1.jpg)
    const fileName = `${prefix}_f${floor}.jpg`;

    // Full Firebase path
    const storagePath = `maps/${building}/${fileName}`;

    // Encode it properly
    const encodedPath = encodeURIComponent(storagePath);

    // Final WORKING Firebase download URL
    const imgURL =
      `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedPath}?alt=media`;

    imageElement.src = imgURL;

} else {
    imageElement.src = "";
}

// Insert the image after the room panel
document.querySelector(".panel").after(imageElement);
