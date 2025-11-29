// forgot.js — calls backend API instead of Firebase client SDK

const API_BASE = "https://web-campus-guide-uph.vercel.app";

const form = document.getElementById("resetForm");
const emailEl = document.getElementById("email");
const msgEl = document.getElementById("msg");
const submitBtn = form?.querySelector('button[type="submit"]');

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

    if (submitBtn) submitBtn.disabled = true;
    showMsg("Sending reset link...");

    try {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
            method: "POST",
            credentials: "include", // not strictly required but fine
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        let data = {};
        try {
            data = await res.json();
        } catch (_) {
            // ignore JSON parse errors for safety
        }

        if (!res.ok) {
            const code = data.code || res.status;
            console.error("[forgot.js] API error:", res.status, data);

            let msg = "Could not send reset link.";

            if (res.status === 404 || code === "user-not-found") {
                msg = "No account found with that email.";
            } else if (res.status === 400 || code === "invalid-email" || code === "missing-email") {
                msg = "Please enter a valid email address.";
            } else if (res.status === 429 || code === "too-many-requests") {
                msg = "Too many attempts. Try again later.";
            }

            showMsg(msg);
            return;
        }

        // Success
        showMsg("Reset link sent. Please check your email.", true);
        console.log("[forgot.js] Reset link sent OK");
    } catch (err) {
        console.error("[forgot.js] NETWORK / UNKNOWN ERROR:", err);
        showMsg("Could not send reset link. Please try again later.");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
});
