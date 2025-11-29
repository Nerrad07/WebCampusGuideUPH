import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
    getAuth,
    sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDLFaOnFD4ICf3VJcIfNdeS1Pp5v0P7jLU",
    authDomain: "campus-guide-map-uph.firebaseapp.com",
    projectId: "campus-guide-map-uph",
    storageBucket: "campus-guide-map-uph.firebasestorage.app",
    messagingSenderId: "685591421741",
    appId: "1:685591421741:android:fa9a20d84e6949d2b3a9a4",
};

console.log("[forgot.js] Initializing app...");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
console.log("[forgot.js] Auth initialized:", auth);

const form = document.getElementById("resetForm");
const emailEl = document.getElementById("email");
const msgEl = document.getElementById("msg");
const submitBtn = form?.querySelector('button[type="submit"]');

console.log("[forgot.js] Form present?", !!form);

function showMsg(text, ok = false) {
    if (!msgEl) return;
    msgEl.style.color = ok ? "#10b981" : "#e11";
    msgEl.textContent = text || "";
}

form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    showMsg("");

    const email = emailEl?.value.trim();
    console.log("[forgot.js] Submitted email:", email);

    if (!email) {
        showMsg("Please enter your email address.");
        return;
    }

    submitBtn && (submitBtn.disabled = true);
    showMsg("Sending reset link...");

    try {
        await sendPasswordResetEmail(auth, email);
        console.log("[forgot.js] sendPasswordResetEmail SUCCESS");

        showMsg("Reset link sent. Please check your email.", true);
    } catch (err) {
        console.error("[forgot.js] sendPasswordResetEmail ERROR:", err);
        const code = err.code || "";
        let msg = "Could not send reset link.";

    if (code.includes("auth/user-not-found")) {
        msg = "No account found with that email.";
    } else if (code.includes("auth/invalid-email")) {
        msg = "Please enter a valid email address.";
    } else if (code.includes("too-many-requests")) {
        msg = "Too many attempts. Try again later.";
    }

        showMsg(msg + ` (${code})`);
    } finally {
        submitBtn && (submitBtn.disabled = false);
    }
});
