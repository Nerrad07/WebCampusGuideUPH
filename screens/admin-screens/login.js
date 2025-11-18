// login.js — Firebase Auth + Backend Admin Session

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/* ---------- 1) Firebase config ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDLFaOnFD4ICf3VJcIfNdeS1Pp5v0P7jLU",
  authDomain: "campus-guide-map-uph.firebaseapp.com",
  projectId: "campus-guide-map-uph",
  storageBucket: "campus-guide-map-uph.firebasestorage.app",
  messagingSenderId: "685591421741",
  appId: "1:685591421741:android:fa9a20d84e6949d2b3a9a4",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

function showErr(msg) {
  if (errEl) errEl.textContent = msg || "";
}

/* ---------- Check Firestore admin role ---------- */
async function isAdmin(uid) {
  const snap = await getDoc(doc(db, "admins", uid));
  return snap.exists();
}

/* ---------- Firebase login (client side only) ---------- */
async function handleFirebaseLogin(email, password) {
  await setPersistence(auth, browserSessionPersistence);

  const { user } = await signInWithEmailAndPassword(auth, email, password);

  if (!(await isAdmin(user.uid))) {
    await signOut(auth);
    throw new Error("not-admin");
  }

  return user;
}

/* ---------- Server login (session creation) ---------- */
async function handleServerLogin(email, password) {
  const res = await fetch("https://web-campus-guide-uph.vercel.app/auth/login", {
    method: "POST",
    credentials: "include", // VERY IMPORTANT (sets cookie)
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error("Server login error:", data);
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

  if (!email || !pwd) return showErr("Please enter email and password.");

  saveRemember();

  submitBtn && (submitBtn.disabled = true);

  try {
    // 1) Login Firebase client-side
    const user = await handleFirebaseLogin(email, pwd);

    // 2) Login backend (sets session cookie)
    await handleServerLogin(email, pwd);

    // 3) Redirect AFTER session cookie is stored
    window.location.href = "dashboard.html";

  } catch (e) {
    console.error(e);

    const code = e.code || e.message || "";
    let msg = "Login failed";

    if (code.includes("invalid-credential") || code.includes("wrong-password"))
      msg = "Invalid email or password.";
    else if (code.includes("user-not-found"))
      msg = "No account with that email.";
    else if (code.includes("too-many-requests"))
      msg = "Too many attempts. Try again later.";
    else if (code === "not-admin")
      msg = "Your account is not an admin.";
    else if (code === "server-login-failed")
      msg = "Server rejected login. Check admin role or API.";

    showErr(msg);

  } finally {
    submitBtn && (submitBtn.disabled = false);
  }
});
