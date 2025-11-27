const API_BASE = "https://web-campus-guide-uph.vercel.app";


async function checkSession() {
    try {
        const res = await fetch(`${API_BASE}/auth/me`, {
            method: "GET",
            credentials: "include"
        });

        if (!res.ok) {
            console.warn("Not authenticated");
            return false;
        }
        const user = await res.json();
        console.log(user.email, " logging out");
        return true

    } catch (err) {
        console.error("Session check error:", err);
        return false
    }
}

async function logout() {
    try {
        const res = await fetch(`${API_BASE}/auth/logout`, {
            method: "POST",
            credentials: "include"
        });

        if (!res.ok) {
            alert("Failed to log out.");
            return;
        }
        else{
          console.log("successfully logged out")
        }
    } catch (err) {
        console.error("Logout error:", err);
        alert("Logout failed — check console.");
    }
}

if (checkSession()){
  logout()
}
else{
  console.log("no session")
}