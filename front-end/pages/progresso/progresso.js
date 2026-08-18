lucide.createIcons();

document.getElementById("logoutBtn").addEventListener("click", () => logout());

const focusBtn = document.getElementById("focusModeBtn");
let focusActive = localStorage.getItem("lumos_focus") === "1";
document.body.classList.toggle("focus-mode", focusActive);
focusBtn && focusBtn.addEventListener("click", () => {
    focusActive = !focusActive;
    localStorage.setItem("lumos_focus", focusActive ? "1" : "0");
    document.body.classList.toggle("focus-mode", focusActive);
    focusBtn.querySelector("span").textContent = focusActive ? "Sair do Foco" : "Modo Foco";
});

async function load() {
    try {
        const [activities, dashData] = await Promise.all([
            apiRequest("/activities"),
            apiRequest("/dashboard")
        ]);

        const completed = activities.filter(a => a.completed).length;
        const total = activities.length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const xp = completed * 10;

        document.getElementById("statCompleted").textContent = completed;
        document.getElementById("statTotal").textContent = total;
        document.getElementById("statPct").textContent = pct + "%";
        document.getElementById("statXp").textContent = xp + " XP";

        // Activities list
        const list = document.getElementById("progressList");
        if (!activities.length) {
            list.innerHTML = '<p class="empty-state">Nenhuma atividade disponível.</p>';
        } else {
            const TYPE_LABELS = { QUIZ:"Quiz", FLASHCARD:"Flashcard", TRUE_FALSE:"V/F", MULTIPLE_CHOICE:"Múlt. Escolha", MATCHING:"Associação", GAME:"Jogo", STANDARD:"Leitura" };
            list.innerHTML = activities.map(a => `
                <div class="progress-item">
                    <div class="progress-item-info">
                        <span class="progress-item-badge ${a.activity_type.toLowerCase()}">${TYPE_LABELS[a.activity_type] || a.activity_type}</span>
                        <span class="progress-item-title">${a.title}</span>
                        ${a.subject ? `<span class="progress-item-subject">${a.subject}</span>` : ""}
                    </div>
                    <div class="progress-item-status">
                        ${a.completed
                            ? `<span class="status-done">✓ Concluída${a.score != null ? ` · ${a.score}%` : ""}</span>`
                            : `<span class="status-pending">Pendente</span>`}
                    </div>
                </div>
            `).join("");
        }

        // Subject progress
        const subjects = {};
        activities.forEach(a => {
            if (!a.subject) return;
            if (!subjects[a.subject]) subjects[a.subject] = { total: 0, done: 0 };
            subjects[a.subject].total++;
            if (a.completed) subjects[a.subject].done++;
        });

        const subjectEl = document.getElementById("subjectProgress");
        const entries = Object.entries(subjects);
        if (!entries.length) {
            subjectEl.innerHTML = '<p class="empty-state">Nenhuma matéria encontrada.</p>';
        } else {
            subjectEl.innerHTML = entries.map(([subj, s]) => {
                const pct = s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                return `<div class="subject-bar">
                    <div class="subject-bar-header">
                        <span>${subj}</span>
                        <span>${s.done}/${s.total} · ${pct}%</span>
                    </div>
                    <div class="progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
                        <div class="progress-fill" style="width:${pct}%"></div>
                    </div>
                </div>`;
            }).join("");
        }

    } catch (e) {
        document.getElementById("progressList").innerHTML = `<p class="empty-state">Erro: ${e.message}</p>`;
    }
}

load();
