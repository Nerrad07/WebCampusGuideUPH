// login.js — API-based authentication (no Firebase SDK)

// Elements
const form = document.getElementById("loginForm");
const errEl = document.getElementById("err");
const remember = document.getElementById("remember");
const submitBtn = form?.querySelector('button[type="submit"]');
const emailEl = form?.email;
const passEl = form?.password;

// LocalStorage keys
const LS_EMAIL_KEY = "campusGuide:rememberEmail";
const LS_FLAG_KEY = "campusGuide:rememberChecked";

// Load remembered email
(() => {
  const saved = localStorage.getItem(LS_EMAIL_KEY);
  const checked = localStorage.getItem(LS_FLAG_KEY) === "1";
  if (saved) emailEl.value = saved;
  remember.checked = checked && !!saved;
})();

// Helper: display error
function showErr(msg) {
  if (errEl) errEl.textContent = msg || "";
}

// Helper: save remember state
function saveRemember() {
  if (remember.checked) {
    localStorage.setItem(LS_EMAIL_KEY, emailEl.value.trim());
    localStorage.setItem(LS_FLAG_KEY, "1");
  } else {
    localStorage.removeItem(LS_EMAIL_KEY);
    localStorage.removeItem(LS_FLAG_KEY);
  }
}

// --- Main login handler ---
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  showErr("");

  const email = emailEl?.value?.trim();
  const password = passEl?.value ?? "";
  if (!email || !password) return showErr("Please enter email and password.");

  saveRemember();
  submitBtn.disabled = true;

  try {
    const res = await fetch("https://web-campus-guide-uph.vercel.app/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Login failed");
    }

    console.log("Session created:", data);

    window.location.href = "dashboard.html";
  } catch (err) {
    console.error("Login failed:", err);
    showErr(err.message || "Login failed");
  } finally {
    submitBtn.disabled = false;
  }
});
