const API_BASE = "https://web-campus-guide-uph.vercel.app";


async function checkSession() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      credentials: "include"
    });

    // Not authenticated (no session cookie)
    if (res.status === 401) {
      console.warn("Not authenticated (401)");
      return false;
    }

    // Logged in but not an admin
    if (res.status === 403) {
      console.warn("Not an admin (403)");
      return false;
    }

    // Any unexpected server problem
    if (!res.ok) {
      console.warn("Session error");
      return false;
    }

    // Valid admin session
    const user = await res.json();
    console.log("Authenticated admin:", user.email);
    return true;

  } catch (err) {
    console.error("Session check error:", err);
    return false;
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
    } else {
      console.log("successfully logged out");
    }
  } catch (err) {
    console.error("Logout error:", err);
    alert("Logout failed — check console.");
  }
}

if (await checkSession()) {
  logout();
} else {
  console.log("no session");
}