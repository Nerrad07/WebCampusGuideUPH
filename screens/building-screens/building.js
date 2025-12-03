const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const pageName = location.pathname.split("/").pop() || "";
const BUILDING = pageName.charAt(0).toUpperCase();

const API_BASE =
	"https://web-campus-guide-uph.vercel.app" || "http://localhost:3000";

const FACULTIES = {
	B: {
		fit: {
			name: "Faculty of Information Technology",
			description:
				"for students in the field, to study logical thinking, software engineering & systems.",
			majors: ["Informatics", "Information Systems"],
			floor: "Floor 3 (B34x wing)",
		},
		fai: {
			name: "Faculty of Artificial Intelligence",
			description:
				"for students in the field, to study artificial intelligence and applied machine learning.",
			majors: ["AI", "Data Science"],
			floor: "Floor 5 (B50x wing)",
		},
		fom: {
			name: "Faculty of Music",
			description:
				"for students in the field, to study performance & music technology programs.",
			majors: ["Music Performance", "Sound Tracker"],
			floor: "Floor 1 (Recital Hall side)",
		},
		fast: {
			name: "Faculty of Science and Technology",
			description:
				"for students in the field, to study interdisciplinary science and tech collaboration.",
			majors: [
				"Biotechnology",
				"Applied Mathematics",
				"Industrial Engineering",
				"Food Technology",
			],
			floor: "Floor 4 (Lab corridor)",
		},
	},
	C: {
		lib: {
			name: "Johannes Oentoro Library",
			description:
				"serves as campus library & study services. Available for students and lecturers.",
			majors: ["Library Services", "Research Support", "Information Literacy"],
			floor: "Floor 2 (Central atrium)",
		},
		chapel: {
			name: "Grand Chapel",
			description:
				"serves as multi-purpose chapel & event hall. Chapel service is held here weekly.",
			majors: [
				"Music & Liturgy Team",
				"Event Stewardship",
				"UPH Awards",
				"Ambassador of UPH",
			],
			floor: "Floor 2 (Grand hall)",
		},
		registrar: {
			name: "Registration Office",
			description:
				"serves as admissions & records center, to register as student in the university.",
			majors: [
				"Admissions Service",
				"Records Management",
				"Registration Service",
			],
			floor: "Floor 1 (Lobby wing)",
		},
		rector: {
			name: "Rectorate Office",
			description:
				"serves as private office for university leadership and administrative board.",
			majors: ["Rectorate", "Public Relations"],
			floor: "Floor 6 (Executive area)",
		},
	},
	D: {
		fht: {
			name: "Faculty of Hospitality & Tourism",
			description:
				"for students in the field, to study hospitality and tourism management.",
			majors: ["Chef", "Baker", "Drink Master"],
			floor: "Floor 1 (Practice kitchen)",
		},
	},
	F: {
		law: {
			name: "Faculty of Law",
			description:
				"for students in the field, to study legal studies & clinics.",
			majors: ["Private Law", "Criminal Law", "International Law"],
			floor: "Floor 2 (Moot court wing)",
		},
		fisip: {
			name: "Faculty of Social & Political Sciences",
			description:
				"for students in the field, to study communication & governance.",
			majors: [
				"Communication",
				"International Relations",
				"Public Administration",
			],
			floor: "Floor 3 (Communication labs)",
		},
	},
};

function formatDate(timestamp) {
	if (!timestamp) return "—";
	const d = new Date(Number(timestamp));
	return d.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
}

function formatTime(minutes) {
	if (typeof minutes !== "number") return "—";
	const h = String(Math.floor(minutes / 60)).padStart(2, "0");
	const m = String(minutes % 60).padStart(2, "0");
	return `${h}:${m}`;
}

async function fetchEvents() {
	try {
		const res = await fetch(`${API_BASE}/events`, {
			method: "GET",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
		});
		if (!res.ok) throw new Error(res.statusText);
		const data = await res.json();
		return Object.entries(data).map(([id, ev]) => ({ id, ...ev }));
	} catch (err) {
		console.error("🔥 Failed to fetch events:", err);
		return [];
	}
}

function renderEvents(events) {
	const list = $("#eventsList") || $("#bEventsList");
	const tmpl = $("#eventCardTmpl") || $("#bEventCardTmpl");
	const empty = $("#emptyState") || $("#bEmptyState");
	if (!list || !tmpl) return;

	list.innerHTML = "";
	if (!events.length) {
		empty.hidden = false;
		return;
	}
	empty.hidden = true;

	for (const ev of events) {
		const Publish = ev.published;
		const node = tmpl.content.cloneNode(true);
		$(".event-title", node).textContent = ev.name || "Unnamed Event";
		$(".event-heldby", node).textContent = ev.heldBy || "—";
		$(".event-date", node).textContent = formatDate(ev.date);
		$(".event-time", node).textContent = `${formatTime(
			ev.startTimeMinutes
		)} – ${formatTime(ev.endTimeMinutes)}`;
		$(".event-room", node).textContent = ev.room || "—";

		const badge = $(".badge.status", node);
		if (badge) {
			const now = Date.now();
			const eventStart =
				new Date(Number(ev.date)).getTime() + ev.startTimeMinutes * 60000;
			const eventEnd =
				new Date(Number(ev.date)).getTime() + ev.endTimeMinutes * 60000;

			const eventDay = new Date(Number(ev.date));
			eventDay.setHours(0, 0, 0, 0);

			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const diffDays = Math.floor((eventDay - today) / (1000 * 60 * 60 * 24));

			let status = "Upcoming";

			if (now >= eventStart && now <= eventEnd) {
				status = "Ongoing";
			} else if (diffDays >= 0 && diffDays <= 7) {
				status = "Upcoming";
			} else if (diffDays >= 8) {
				status = "Coming Soon";
			} else {
				continue;
			}

			badge.textContent = status;
			badge.dataset.status = status;
		}

		if (!Publish) continue;

		list.appendChild(node);
	}
}

const BUCKET = "campus-guide-map-uph.firebasestorage.app";

let facultyImages;

if (BUILDING == "B") {
	facultyImages = {
		fit: "fit.jpg",
		fai: "fai.jpg",
		fom: "fm.jpeg",
		fast: "fast.jpg",
	};
} else if (BUILDING == "C") {
	facultyImages = {
		lib: "jo_library_l2.jpg",
		chapel: "grand_chapel_l7.jpg",
		registrar: "registrar_office.jpg",
		rector: "rectorate_office.jpg",
	};
} else if (BUILDING == "D") {
	facultyImages = {
		fht: "fhospar.jpg",
	};
} else if (BUILDING == "F") {
	facultyImages = {
		law: "fh.jpg",
		fisip: "fisip.jpeg",
	};
}

document.querySelectorAll(".faculty-card").forEach((btn) => {
	const key = btn.dataset.faculty;
	const img = btn.querySelector(".faculty-icon");

	if (!facultyImages[key]) return;

	const fileName = facultyImages[key];
	let storagePath = `faculties/${fileName}`;
	if (BUILDING == "C") {
		storagePath = `featured/${fileName}`;
	}
	const encodedPath = encodeURIComponent(storagePath);

	const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedPath}?alt=media`;

	img.src = url;
});

const modal = {
	root: $("#facultyModal"),
	title: $("#modalTitle"),
	desc: $(".modal_desc"),
	list: $("#modalMajors"),

	open(payload) {
		if (!this.root) return;
		this.title.textContent = payload.name;
		const loc = payload.floor
			? `<strong>Location: ${payload.floor}</strong> — `
			: "";
		this.desc.innerHTML = `${loc}${payload.name} is a ${
			BUILDING === "C" ? "facility" : "faculty"
		} ${payload.description}`;
		this.list.innerHTML = "";
		(payload.majors || []).forEach((m) => {
			const li = document.createElement("li");
			li.textContent = m;
			this.list.appendChild(li);
		});
		this.root.classList.add("is-open");
		this.root.setAttribute("aria-hidden", "false");
		document.body.style.overflow = "hidden";
	},

	close() {
		if (!this.root) return;
		this.root.classList.remove("is-open");
		this.root.setAttribute("aria-hidden", "true");
		document.body.style.overflow = "";
	},

	bind() {
		this.root?.addEventListener("click", (e) => {
			if (e.target.matches("[data-close-modal]")) this.close();
		});
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && this.root?.classList.contains("is-open"))
				this.close();
		});
	},
};

function bindFacultyCards() {
	const map = FACULTIES[BUILDING] || {};
	$$(".faculty-card").forEach((btn) => {
		btn.addEventListener("click", () => {
			const key = btn.getAttribute("data-faculty");
			const data = map[key];
			if (data) modal.open(data);
		});
	});
}

(async function init() {
	modal.bind();
	bindFacultyCards();

	const allEvents = await fetchEvents();

	const filtered = allEvents.filter(
		(e) => e.building?.toUpperCase() === BUILDING
	);
	
	filtered.sort((a, b) => {
        const dateA = Number(a.date);
        const dateB = Number(b.date);

        if (dateA !== dateB) return dateA - dateB;

        return a.startTimeMinutes - b.startTimeMinutes;
    });

	renderEvents(filtered);
})();
