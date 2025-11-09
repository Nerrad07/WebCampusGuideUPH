// forgot.js — local change password (no email) using Firebase Auth

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

/* ---- Firebase config (replace with your project values) ---- */
const app = initializeApp({
  apiKey: "AIzaSyDLFaOnFD4ICf3VJcIfNdeS1Pp5v0P7jLU",
  authDomain: "campus-guide-map-uph.firebaseapp.com",
  projectId: "campus-guide-map-uph",
});
const auth = getAuth(app);

/* ---- DOM ---- */
const form = document.getElementById("changeForm");
const curEl = document.getElementById("currentPass");
const newEl = document.getElementById("newPass");
const cfmEl = document.getElementById("confirmPass");
const msgEl = document.getElementById("msg");
const tCur = document.getElementById("toggleCurrent");
const tNew = document.getElementById("toggleNew");
const tCfm = document.getElementById("toggleConfirm");

/* show/hide toggles */
const bindToggle = (btn, input) =>
  btn?.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "Hide" : "Show";
  });
bindToggle(tCur, curEl);
bindToggle(tNew, newEl);
bindToggle(tCfm, cfmEl);

/* must be signed in */
onAuthStateChanged(auth, (user) => {
  if (!user) location.replace("./login.html");
});

/* submit */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msgEl.style.color = "#e11"; // red
  msgEl.textContent = "";

  const current = curEl.value;
  const next = newEl.value;
  const confirm = cfmEl.value;

  if (next !== confirm) {
    msgEl.textContent = "Passwords do not match.";
    return;
  }
  if (next.length < 8) {
    msgEl.textContent = "New password must be at least 8 characters.";
    return;
  }
  if (next === current) {
    msgEl.textContent = "New password must be different.";
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    msgEl.textContent = "You are not signed in.";
    return;
  }

  try {
    // reauthenticate with current password
    const cred = EmailAuthProvider.credential(user.email, current);
    await reauthenticateWithCredential(user, cred);

    // update to new password
    await updatePassword(user, next);

    msgEl.style.color = "#10b981"; // green
    msgEl.textContent = "Password updated. Please sign in again.";
    setTimeout(async () => {
      await signOut(auth);
      location.replace("./login.html");
    }, 1000);
  } catch (e2) {
    const code = e2.code || e2.message || "";
    let msg = "Could not change password.";
    if (code.includes("wrong-password")) msg = "Current password is incorrect.";
    else if (code.includes("requires-recent-login"))
      msg = "Please sign out and sign in again, then retry.";
    else if (code.includes("too-many-requests"))
      msg = "Too many attempts. Try again later.";
    msgEl.textContent = msg;
  }
});
