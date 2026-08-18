lucide.createIcons();

document.getElementById("logoutBtn").addEventListener("click", () => logout());

// ——— Focus mode ———
const focusBtn = document.getElementById("focusModeBtn");
let focusActive = localStorage.getItem("lumos_focus") === "1";
document.body.classList.toggle("focus-mode", focusActive);
focusBtn && focusBtn.addEventListener("click", () => {
    focusActive = !focusActive;
    localStorage.setItem("lumos_focus", focusActive ? "1" : "0");
    document.body.classList.toggle("focus-mode", focusActive);
    focusBtn.querySelector("span").textContent = focusActive ? "Sair do Foco" : "Modo Foco";
});

function showAlert(id, duration = 3000) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "block";
    setTimeout(() => { el.style.display = "none"; }, duration);
}

// ——— Load profile ———
async function loadProfile() {
    try {
        const user = await apiRequest("/profile");
        document.getElementById("profileName").value = user.name || "";
        document.getElementById("profileEmail").value = user.email || "";
        if (user.role === "ADMIN") {
            document.getElementById("adminSection").style.display = "block";
        }
    } catch (e) {
        const u = getUser();
        if (u) {
            document.getElementById("profileName").value = u.name || "";
            document.getElementById("profileEmail").value = u.email || "";
            if (u.role === "ADMIN") document.getElementById("adminSection").style.display = "block";
        }
    }
}

document.getElementById("btnSaveProfile").addEventListener("click", async () => {
    const name = document.getElementById("profileName").value.trim();
    const email = document.getElementById("profileEmail").value.trim();
    if (!name || !email) { alert("Preencha nome e e-mail."); return; }
    const btn = document.getElementById("btnSaveProfile");
    btn.disabled = true; btn.textContent = "Salvando...";
    try {
        const updated = await apiRequest("/profile", {
            method: "PUT",
            body: JSON.stringify({ name, email })
        });
        // Update local user
        const u = getUser() || {};
        localStorage.setItem("lumos_user", JSON.stringify({ ...u, name: updated.name, email: updated.email }));
        showAlert("profileAlert");
    } catch (e) {
        alert(e.message || "Erro ao salvar perfil.");
    } finally {
        btn.disabled = false; btn.textContent = "Salvar perfil";
    }
});

document.getElementById("btnSavePass").addEventListener("click", async () => {
    const current = document.getElementById("currentPass").value;
    const newP = document.getElementById("newPass").value;
    if (!current || !newP) { alert("Preencha a senha atual e a nova senha."); return; }
    if (newP.length < 6) { alert("A nova senha deve ter pelo menos 6 caracteres."); return; }
    const btn = document.getElementById("btnSavePass");
    btn.disabled = true; btn.textContent = "Alterando...";
    try {
        await apiRequest("/profile/password", {
            method: "PUT",
            body: JSON.stringify({ currentPassword: current, newPassword: newP })
        });
        document.getElementById("currentPass").value = "";
        document.getElementById("newPass").value = "";
        showAlert("passAlert");
    } catch (e) {
        alert(e.message || "Erro ao alterar senha.");
    } finally {
        btn.disabled = false; btn.textContent = "Alterar senha";
    }
});

// ——— Accessibility settings ———
const acc = window.lumosAccessibility;

function loadAccessibilityToggles() {
    const s = acc.getSettings();

    // Font size
    const fsEl = document.getElementById("fontSizeSelect");
    fsEl.value = s.fontSize || "normal";
    fsEl.addEventListener("change", () => {
        acc.save({ fontSize: fsEl.value });
    });

    // Toggles
    const toggles = {
        toggleContrast: "contrast",
        toggleMotion: "reducedMotion",
        toggleFocus: "focusVisible",
        toggleSpacing: "textSpacing",
        toggleDyslexic: "dyslexicFont"
    };

    Object.entries(toggles).forEach(([elId, key]) => {
        const el = document.getElementById(elId);
        if (!el) return;
        el.checked = !!s[key];
        el.addEventListener("change", () => {
            acc.save({ [key]: el.checked });
        });
    });

    // Focus mode toggle
    const focusModeToggle = document.getElementById("toggleFocusMode");
    focusModeToggle.checked = localStorage.getItem("lumos_focus") === "1";
    focusModeToggle.addEventListener("change", () => {
        const val = focusModeToggle.checked;
        localStorage.setItem("lumos_focus", val ? "1" : "0");
        document.body.classList.toggle("focus-mode", val);
        focusBtn.querySelector("span").textContent = val ? "Sair do Foco" : "Modo Foco";
    });
}

loadProfile();
loadAccessibilityToggles();
