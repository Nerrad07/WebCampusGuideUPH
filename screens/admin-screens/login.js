// login.js — Firebase Auth + Firestore admin check
// Requires your login page to have:
//   <form id="loginForm"> with inputs name="email" and name="password"
//   <p id="err"></p>  (for error text)
//   optional: <input type="checkbox" id="remember">

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/* ---------- 1) Firebase config: replace with yours (Project settings) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDLFaOnFD4ICf3VJcIfNdeS1Pp5v0P7jLU",
  authDomain: "campus-guide-map-uph.firebaseapp.com",
  projectId: "campus-guide-map-uph",
  storageBucket: "campus-guide-map-uph.firebasestorage.app",
  messagingSenderId: "685591421741",
  appId: "1:685591421741:android:fa9a20d84e6949d2b3a9a4",
};

/* ---------- 2) Init ---------- */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------- 3) DOM refs ---------- */
const form = document.getElementById("loginForm");
const errEl = document.getElementById("err");
const remember = document.getElementById("remember");
const submitBtn = form?.querySelector('button[type="submit"]');
const emailEl = form?.email;
const passEl = form?.password;

/* ---------- Remember (autofill only) ---------- */
const LS_EMAIL_KEY = "campusGuide:rememberEmail";
const LS_FLAG_KEY = "campusGuide:rememberChecked";

// restore saved email on load
(() => {
  const saved = localStorage.getItem(LS_EMAIL_KEY);
  const checked = localStorage.getItem(LS_FLAG_KEY) === "1";
  if (saved) emailEl.value = saved;
  remember.checked = checked && !!saved;
  if (emailEl.value) passEl?.focus();
})();

function saveRemember() {
  if (remember.checked) {
    localStorage.setItem(LS_EMAIL_KEY, emailEl.value.trim());
    localStorage.setItem(LS_FLAG_KEY, "1");
  } else {
    localStorage.removeItem(LS_EMAIL_KEY);
    localStorage.removeItem(LS_FLAG_KEY);
  }
}

/* ---------- 4) Helpers ---------- */
function showErr(msg) {
  if (errEl) errEl.textContent = msg || "";
}

async function isAdmin(uid) {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}

async function handleLogin(email, password) {
  // always session persistence (no auto-login)
  await setPersistence(auth, browserSessionPersistence);

  const { user } = await signInWithEmailAndPassword(auth, email, password);
  if (!(await isAdmin(user.uid))) {
    await signOut(auth);
    throw new Error("not-admin");
  }
}

/* ---------- 6) Form submit ---------- */
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  showErr("");

  const email = emailEl?.value?.trim();
  const pwd = passEl?.value ?? "";
  if (!email || !pwd) return showErr("Please enter email and password.");

  // save/clear remembered email (no password stored)
  saveRemember();

  submitBtn && (submitBtn.disabled = true);
  try {
    await handleLogin(email, pwd);
    window.location.href = "dashboard.html";
  } catch (e) {
    const code = e.code || e.message || "";
    let msg = "Login failed";
    if (code.includes("invalid-credential") || code.includes("wrong-password"))
      msg = "Invalid email or password.";
    else if (code.includes("user-not-found"))
      msg = "No account with that email.";
    else if (code.includes("too-many-requests"))
      msg = "Too many attempts. Try again later.";
    else if (code === "not-admin") msg = "Your account is not an admin.";
    showErr(msg);
  } finally {
    submitBtn && (submitBtn.disabled = false);
  }
});
