lucide.createIcons();

// ——— Welcome greeting ———
function updateGreeting(name) {
    const h = new Date().getHours();
    const greet = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    document.getElementById("welcomeTitle").textContent = `${greet}, ${name || ""}!`;
}

// ——— Focus mode ———
const focusBtn = document.getElementById("focusModeBtn");
let focusActive = localStorage.getItem("lumos_focus") === "1";

function applyFocusMode(active) {
    document.body.classList.toggle("focus-mode", active);
    if (focusBtn) {
        focusBtn.querySelector("span").textContent = active ? "Sair do Foco" : "Modo Foco";
    }
}
applyFocusMode(focusActive);

focusBtn && focusBtn.addEventListener("click", () => {
    focusActive = !focusActive;
    localStorage.setItem("lumos_focus", focusActive ? "1" : "0");
    applyFocusMode(focusActive);
});

// ——— Logout ———
document.getElementById("logoutBtn").addEventListener("click", () => logout());

// ——— Load dashboard ———
async function loadDashboard() {
    try {
        const data = await apiRequest("/dashboard");
        const user = data.user || {};
        updateGreeting(user.name);

        if (user.role === "ADMIN") {
            document.getElementById("adminBadge").style.display = "inline-flex";
        }

        const completed = data.stats?.completedActivities || 0;
        const total = data.stats?.totalActivities || 0;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        document.getElementById("completedCount").textContent = `${completed}/${total}`;
        document.getElementById("levelXp").textContent = `${completed * 10} XP`;
        document.getElementById("levelNumber").textContent = `NÍVEL ${Math.floor(completed / 5) + 1}`;

        const fill = document.getElementById("progressFill");
        fill.style.width = pct + "%";
        fill.closest(".progress-bar").setAttribute("aria-valuenow", pct);

    } catch (e) {
        // Fallback from local storage
        const u = getUser();
        if (u) updateGreeting(u.name);
    }
}

// ——— Load recent activities ———
async function loadRecentActivities() {
    const list = document.getElementById("dailyList");
    try {
        const activities = await apiRequest("/activities?limit=3");
        if (!activities || !activities.length) {
            list.innerHTML = '<p class="empty-state">Nenhuma atividade disponível.</p>';
            return;
        }

        const typeLabels = {
            QUIZ: "Quiz", FLASHCARD: "Flashcard", TRUE_FALSE: "V/F",
            MULTIPLE_CHOICE: "Múlt. Escolha", MATCHING: "Associação",
            GAME: "Jogo", STANDARD: "Texto"
        };

        list.innerHTML = activities.slice(0, 4).map(a => `
            <div class="daily-item ${a.completed ? "completed" : ""}">
                <span class="daily-number">${a.completed ? "✓" : "→"}</span>
                <span>${a.title}</span>
                <span class="daily-type-badge">${typeLabels[a.activity_type] || a.activity_type}</span>
            </div>
        `).join("");

        // Next pending activity
        const pending = activities.find(a => !a.completed);
        if (pending) {
            document.getElementById("subjectTag").textContent = pending.subject || "—";
            document.getElementById("activityTitle").textContent = pending.title;
            document.getElementById("activityDescription").textContent = pending.description || "Acesse para mais detalhes.";
            document.getElementById("activityType").textContent = typeLabels[pending.activity_type] || "—";
            document.getElementById("activityButton").dataset.id = pending.id;
        }
    } catch (e) {
        list.innerHTML = '<p class="empty-state">Não foi possível carregar atividades.</p>';
    }
}

document.getElementById("agendaButton").addEventListener("click", () => {
    window.location.href = "/lumos-connect/front-end/pages/agenda/agenda.html";
});
document.getElementById("activityButton").addEventListener("click", () => {
    window.location.href = "/lumos-connect/front-end/pages/atividades/atividades.html";
});

loadDashboard();
loadRecentActivities();
