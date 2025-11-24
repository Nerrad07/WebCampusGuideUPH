// login.js — API-only authentication (no Firebase client SDK)

/* ---------- DOM refs ---------- */
const form = document.getElementById("loginForm");
const errEl = document.getElementById("err");
const remember = document.getElementById("remember");
const submitBtn = form?.querySelector('button[type="submit"]');
const emailEl = form?.email;
const passEl = form?.password;

/* ---------- Remember Me (local email) ---------- */
const LS_EMAIL_KEY = "campusGuide:rememberEmail";
const LS_FLAG_KEY = "campusGuide:rememberChecked";

// Initialize remembered email
(() => {
  const saved = localStorage.getItem(LS_EMAIL_KEY);
  const checked = localStorage.getItem(LS_FLAG_KEY) === "1";
  if (saved && emailEl) emailEl.value = saved;
  if (remember) remember.checked = checked && !!saved;
  if (emailEl?.value && passEl) passEl.focus();
})();

function saveRemember() {
  if (!emailEl || !remember) return;

  if (remember.checked) {
    localStorage.setItem(LS_EMAIL_KEY, emailEl.value.trim());
    localStorage.setItem(LS_FLAG_KEY, "1");
  } else {
    localStorage.removeItem(LS_EMAIL_KEY);
    localStorage.removeItem(LS_FLAG_KEY);
  }
}

function showErr(msg) {
  if (errEl) errEl.textContent = msg || "";
}

/* ---------- Server login (session creation) ---------- */
async function handleServerLogin(email, password) {
  const res = await fetch("https://web-campus-guide-uph.vercel.app/auth/login", {
    method: "POST",
    credentials: "include", // VERY IMPORTANT (session cookie)
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error("[login] Server login error:", data);

    if (res.status === 401) throw new Error("invalid-credential");
    if (res.status === 403) throw new Error("not-admin");
    throw new Error("server-login-failed");
  }

  return res.json();
}

/* ---------- Form Submit ---------- */
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  showErr("");

  const email = emailEl?.value?.trim();
  const pwd = passEl?.value ?? "";

  if (!email || !pwd) {
    showErr("Please enter email and password.");
    return;
  }

  saveRemember();

  if (submitBtn) submitBtn.disabled = true;

  try {
    await handleServerLogin(email, pwd);

    // Redirect AFTER server session is created
    window.location.href = "dashboard.html";
  } catch (e) {
    console.error("[login] ERROR:", e);
    const code = e.message || "";
    let msg = "Login failed";

    if (code === "invalid-credential")
      msg = "Invalid email or password.";
    else if (code === "not-admin")
      msg = "Your account is not an admin.";
    else if (code === "server-login-failed")
      msg = "Server rejected login. Try again later.";

    showErr(msg);
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});
