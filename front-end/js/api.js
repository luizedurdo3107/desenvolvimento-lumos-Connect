// ============================================
// Lumos Connect - API Service
// ============================================

const API_URL = window.LUMOS_API_URL || "http://localhost:3000";

async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem("lumos_token");

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
            ...(options.headers || {})
        }
    });

    let data;
    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        if (response.status === 401) {
            localStorage.removeItem("lumos_token");
            localStorage.removeItem("lumos_user");
            window.location.href = "/lumos-connect/front-end/pages/login/login.html";
            return;
        }
        throw new Error(data.message || "Erro na requisição");
    }

    return data;
}

function getUser() {
    try {
        const raw = localStorage.getItem("lumos_user");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function getToken() {
    return localStorage.getItem("lumos_token");
}

function isAdmin() {
    const user = getUser();
    return user && user.role === "ADMIN";
}

function isLoggedIn() {
    return !!getToken();
}
