async function login(email, password) {
    const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });

    localStorage.setItem("lumos_token", data.token);

    if (data.user) {
        localStorage.setItem("lumos_user", JSON.stringify(data.user));
    }

    return data;
}

async function register(name, email, password) {
    const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password })
    });
    return data;
}

function getToken() {
    return localStorage.getItem("lumos_token");
}

function getUser() {
    const user = localStorage.getItem("lumos_user");
    if (!user) return null;
    try { return JSON.parse(user); } catch { return null; }
}

function isAuthenticated() {
    return !!getToken();
}

function isAdmin() {
    const u = getUser();
    return u && u.role === "ADMIN";
}

function logout() {
    localStorage.removeItem("lumos_token");
    localStorage.removeItem("lumos_user");
    window.location.href = "/lumos-connect/front-end/pages/login/login.html";
}
