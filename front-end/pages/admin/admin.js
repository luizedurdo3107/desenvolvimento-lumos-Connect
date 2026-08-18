// Admin guard
(function () {
    const user = localStorage.getItem("lumos_user");
    if (!user) { window.location.href = "/lumos-connect/front-end/pages/login/login.html"; return; }
    try {
        const u = JSON.parse(user);
        if (u.role !== "ADMIN") { window.location.href = "/lumos-connect/front-end/pages/inicio/inicio.html"; }
    } catch { window.location.href = "/lumos-connect/front-end/pages/login/login.html"; }
})();

lucide.createIcons();

const TYPE_LABELS = {
    QUIZ:"Quiz", FLASHCARD:"Flashcard", TRUE_FALSE:"Verdadeiro/Falso",
    MULTIPLE_CHOICE:"Múltipla Escolha", MATCHING:"Associação", GAME:"Jogo", STANDARD:"Texto"
};

let allActivities = [];
let allUsers = [];
let editingId = null;
let typeFilter = "all";
let questionCount = 0;

document.getElementById("logoutBtn").addEventListener("click", () => logout());

// ——— Tabs ———
document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll("[data-tab]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        const tab = btn.dataset.tab;
        document.getElementById("panelActivities").style.display = tab === "activities" ? "block" : "none";
        document.getElementById("panelUsers").style.display = tab === "users" ? "block" : "none";
        document.getElementById("pageTitle").textContent = tab === "activities" ? "Gerenciar Atividades" : "Gerenciar Usuários";
        if (tab === "users") loadUsers();
    });
});

// ——— Type filter tabs ———
document.querySelectorAll(".tab-btn[data-type]").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn[data-type]").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        typeFilter = btn.dataset.type;
        renderActivitiesTable();
    });
});

// ——— Search ———
document.getElementById("searchActivities").addEventListener("input", renderActivitiesTable);

// ——— Toast ———
function toast(msg, type = "success") {
    const el = document.createElement("div");
    el.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;background:#fff;border-left:4px solid ${type==="error"?"#ef4444":"#4E6F5A"};border-radius:10px;padding:14px 18px;box-shadow:0 8px 30px rgba(0,0,0,.15);font-size:.9rem;min-width:260px;color:#222;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// ——— Load data ———
async function loadAll() {
    try {
        const [activities, users] = await Promise.all([
            apiRequest("/activities/admin/all"),
            apiRequest("/users")
        ]);
        allActivities = activities;
        allUsers = users;
        updateStats();
        renderActivitiesTable();
    } catch (e) {
        toast("Erro ao carregar dados: " + e.message, "error");
    }
}

function updateStats() {
    document.getElementById("statActivities").textContent = allActivities.length;
    document.getElementById("statPublished").textContent = allActivities.filter(a => a.is_published).length;
    document.getElementById("statUsers").textContent = allUsers.length;
    document.getElementById("statCompletions").textContent = allActivities.reduce((s, a) => s + (a.completions || 0), 0);
}

function renderActivitiesTable() {
    const search = document.getElementById("searchActivities").value.toLowerCase();
    let filtered = allActivities;
    if (typeFilter !== "all") filtered = filtered.filter(a => a.activity_type === typeFilter);
    if (search) filtered = filtered.filter(a =>
        a.title.toLowerCase().includes(search) ||
        (a.subject || "").toLowerCase().includes(search)
    );

    const tbody = document.getElementById("activitiesTableBody");
    if (!filtered.length) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);padding:24px">Nenhuma atividade encontrada.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map(a => `
        <tr>
            <td><strong>${a.title}</strong></td>
            <td><span class="badge badge-${a.activity_type.toLowerCase()}">${TYPE_LABELS[a.activity_type] || a.activity_type}</span></td>
            <td>${a.subject || "—"}</td>
            <td>${a.question_count || 0}</td>
            <td>${a.completions || 0}</td>
            <td><span class="badge ${a.is_published ? "badge-published" : "badge-draft"}">${a.is_published ? "Publicada" : "Rascunho"}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-action primary" onclick="editActivity(${a.id})" aria-label="Editar ${a.title}">
                        <i data-lucide="pencil"></i> Editar
                    </button>
                    <button class="btn-action" onclick="duplicateActivity(${a.id})" aria-label="Duplicar ${a.title}">
                        <i data-lucide="copy"></i>
                    </button>
                    <button class="btn-action" onclick="togglePublish(${a.id})" aria-label="${a.is_published ? "Desativar" : "Publicar"} ${a.title}">
                        <i data-lucide="${a.is_published ? "eye-off" : "eye"}"></i>
                    </button>
                    <button class="btn-action danger" onclick="deleteActivity(${a.id})" aria-label="Excluir ${a.title}">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join("");
    lucide.createIcons();
}

async function loadUsers() {
    const tbody = document.getElementById("usersTableBody");
    try {
        allUsers = await apiRequest("/users");
        updateStats();
        tbody.innerHTML = allUsers.map(u => `
            <tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td><span class="badge ${u.role === "ADMIN" ? "badge-published" : "badge-draft"}">${u.role}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString("pt-BR")}</td>
                <td>
                    <button class="btn-action ${u.role === "ADMIN" ? "danger" : "primary"}" onclick="toggleUserRole(${u.id}, '${u.role}')">
                        ${u.role === "ADMIN" ? "Tornar estudante" : "Tornar admin"}
                    </button>
                </td>
            </tr>
        `).join("");
        lucide.createIcons();
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center">Erro: ${e.message}</td></tr>`;
    }
}

async function toggleUserRole(id, current) {
    const newRole = current === "ADMIN" ? "STUDENT" : "ADMIN";
    if (!confirm(`Alterar role para ${newRole}?`)) return;
    try {
        await apiRequest(`/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role: newRole }) });
        toast("Role atualizada!");
        loadUsers();
    } catch (e) { toast(e.message, "error"); }
}

// ——— Question builder ———
function getQuestionTypeOptions(actType) {
    if (actType === "FLASHCARD") return `<option value="FLASHCARD">Flashcard</option>`;
    if (actType === "TRUE_FALSE") return `<option value="TRUE_FALSE">Verdadeiro/Falso</option>`;
    if (actType === "MULTIPLE_CHOICE") return `<option value="MULTIPLE_CHOICE">Múltipla Escolha</option>`;
    if (actType === "MATCHING") return `<option value="MATCHING">Associação</option>`;
    return `
        <option value="MULTIPLE_CHOICE">Múltipla Escolha</option>
        <option value="TRUE_FALSE">Verdadeiro/Falso</option>
        <option value="FLASHCARD">Flashcard</option>
        <option value="MATCHING">Associação</option>
        <option value="SHORT_ANSWER">Resposta curta</option>
    `;
}

function addQuestion(qData = null) {
    const actType = document.getElementById("actType").value;
    const idx = questionCount++;
    const container = document.createElement("div");
    container.className = "question-item";
    container.id = `question_${idx}`;

    const qType = qData ? qData.question_type : (
        actType === "TRUE_FALSE" ? "TRUE_FALSE" :
        actType === "FLASHCARD" ? "FLASHCARD" :
        actType === "MATCHING" ? "MATCHING" :
        "MULTIPLE_CHOICE"
    );

    container.innerHTML = `
        <div class="question-header">
            <span>Questão ${idx + 1}</span>
            <button type="button" class="btn-remove" onclick="this.closest('.question-item').remove()" aria-label="Remover questão"><i data-lucide="trash-2"></i></button>
        </div>
        <div class="form-group">
            <label>Tipo</label>
            <select class="q-type" onchange="refreshOptions(this, ${idx})" data-idx="${idx}">
                ${getQuestionTypeOptions(actType)}
            </select>
        </div>
        <div class="form-group">
            <label>Enunciado / Frente do card *</label>
            <textarea class="q-text" rows="2" placeholder="Digite a questão..." required>${qData ? qData.question_text : ""}</textarea>
        </div>
        <div class="form-group">
            <label id="expLabel_${idx}">${qType === "FLASHCARD" ? "Resposta / Verso do card" : "Explicação (opcional)"}</label>
            <input type="text" class="q-explanation" placeholder="${qType === "FLASHCARD" ? "Verso do flashcard..." : "Explicação da resposta correta..."}" value="${qData ? (qData.explanation || "") : ""}">
        </div>
        <div class="options-container" id="optionsContainer_${idx}">
            ${buildOptionsHTML(idx, qType, qData ? qData.options : null)}
        </div>
    `;

    document.getElementById("questionsList").appendChild(container);

    // Set selected type
    const typeEl = container.querySelector(".q-type");
    typeEl.value = qType;

    lucide.createIcons();
}

function buildOptionsHTML(idx, qType, existingOptions) {
    if (qType === "FLASHCARD" || qType === "SHORT_ANSWER") return "";
    if (qType === "TRUE_FALSE") {
        const tvChecked = existingOptions && existingOptions[0] && existingOptions[0].is_correct ? "checked" : "";
        const ffChecked = existingOptions && existingOptions[1] && existingOptions[1].is_correct ? "checked" : "";
        return `
            <label style="font-size:.85rem;font-weight:600;margin-bottom:6px;display:block">Resposta correta</label>
            <div class="option-item"><input type="radio" name="tf_${idx}" value="true" ${tvChecked || "checked"}><span class="option-label">Verdadeiro</span></div>
            <div class="option-item"><input type="radio" name="tf_${idx}" value="false" ${ffChecked}><span class="option-label">Falso</span></div>
        `;
    }
    if (qType === "MATCHING") {
        const existing = existingOptions || [{ option_text: "" }];
        return `
            <label style="font-size:.85rem;font-weight:600;margin-bottom:6px;display:block">Resposta correta (para associar)</label>
            <div id="matchOptions_${idx}">
                ${existing.map((o, i) => `
                    <div class="option-item">
                        <input type="text" class="opt-text" placeholder="Definição / par" value="${o.option_text || ""}">
                        ${i > 0 ? `<button type="button" class="btn-remove" onclick="this.parentElement.remove()"><i data-lucide="x"></i></button>` : ""}
                    </div>
                `).join("")}
            </div>
        `;
    }
    // Multiple choice
    const options = existingOptions || [
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false },
        { option_text: "", is_correct: false }
    ];
    const letters = ["A","B","C","D","E"];
    return `
        <label style="font-size:.85rem;font-weight:600;margin-bottom:6px;display:block">Alternativas (marque a correta)</label>
        <div id="mcOptions_${idx}">
            ${options.map((o, i) => `
                <div class="option-item">
                    <span style="font-size:.8rem;font-weight:700;width:20px;flex-shrink:0;color:var(--text-secondary)">${letters[i]}</span>
                    <input type="text" class="opt-text" placeholder="Alternativa ${letters[i]}" value="${o.option_text || ""}">
                    <input type="checkbox" class="opt-correct" title="Marcar como correta" aria-label="Correta" ${o.is_correct ? "checked" : ""}>
                    <span class="option-label">Correta</span>
                    ${i >= 2 ? `<button type="button" class="btn-remove" onclick="this.parentElement.remove()"><i data-lucide="x"></i></button>` : ""}
                </div>
            `).join("")}
        </div>
        <button type="button" class="btn-add-option" onclick="addOption(${idx})">+ Adicionar alternativa</button>
    `;
}

function refreshOptions(selectEl, idx) {
    const qType = selectEl.value;
    document.getElementById(`optionsContainer_${idx}`).innerHTML = buildOptionsHTML(idx, qType, null);
    const expLabel = document.getElementById(`expLabel_${idx}`);
    if (expLabel) expLabel.textContent = qType === "FLASHCARD" ? "Resposta / Verso do card" : "Explicação (opcional)";
    lucide.createIcons();
}

function addOption(idx) {
    const container = document.getElementById(`mcOptions_${idx}`);
    if (!container) return;
    const letters = ["A","B","C","D","E","F"];
    const i = container.children.length;
    const div = document.createElement("div");
    div.className = "option-item";
    div.innerHTML = `
        <span style="font-size:.8rem;font-weight:700;width:20px;flex-shrink:0;color:var(--text-secondary)">${letters[i] || i+1}</span>
        <input type="text" class="opt-text" placeholder="Alternativa">
        <input type="checkbox" class="opt-correct" title="Correta" aria-label="Correta">
        <span class="option-label">Correta</span>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove()"><i data-lucide="x"></i></button>
    `;
    container.appendChild(div);
    lucide.createIcons();
}

// ——— Collect form data ———
function collectFormData() {
    const title = document.getElementById("actTitle").value.trim();
    const subject = document.getElementById("actSubject").value;
    const activity_type = document.getElementById("actType").value;
    const dueDate = document.getElementById("actDue").value || null;
    const description = document.getElementById("actDesc").value.trim();
    const is_published = document.getElementById("actPublished").checked;

    if (!title) throw new Error("Informe o título da atividade.");

    const questions = [];
    document.querySelectorAll(".question-item").forEach(qEl => {
        const q_text = qEl.querySelector(".q-text") ? qEl.querySelector(".q-text").value.trim() : "";
        const q_type = qEl.querySelector(".q-type") ? qEl.querySelector(".q-type").value : "MULTIPLE_CHOICE";
        const q_exp = qEl.querySelector(".q-explanation") ? qEl.querySelector(".q-explanation").value.trim() : "";
        if (!q_text) return;

        const options = [];
        if (q_type === "TRUE_FALSE") {
            const checked = qEl.querySelector('input[type=radio]:checked');
            const isTrue = checked && checked.value === "true";
            options.push({ option_text: "Verdadeiro", is_correct: isTrue });
            options.push({ option_text: "Falso", is_correct: !isTrue });
        } else if (q_type === "FLASHCARD" || q_type === "SHORT_ANSWER") {
            // No options
        } else {
            qEl.querySelectorAll(".opt-text").forEach((input, i) => {
                const text = input.value.trim();
                if (!text) return;
                const isCorrect = input.parentElement.querySelector(".opt-correct")?.checked || false;
                options.push({ option_text: text, is_correct: isCorrect });
            });
        }

        questions.push({ question_text: q_text, question_type: q_type, explanation: q_exp || null, options });
    });

    return { title, subject: subject || null, activity_type, dueDate, description: description || null, is_published, questions };
}

// ——— New / Edit modal ———
function openNewModal() {
    editingId = null;
    questionCount = 0;
    document.getElementById("actModalTitle").textContent = "Nova atividade";
    document.getElementById("actTitle").value = "";
    document.getElementById("actSubject").value = "";
    document.getElementById("actType").value = "STANDARD";
    document.getElementById("actDue").value = "";
    document.getElementById("actDesc").value = "";
    document.getElementById("actPublished").checked = true;
    document.getElementById("questionsList").innerHTML = "";
    document.getElementById("activityModal").style.display = "flex";
    document.getElementById("actTitle").focus();
    lucide.createIcons();
}

async function editActivity(id) {
    try {
        const a = await apiRequest(`/activities/${id}`);
        editingId = id;
        questionCount = 0;
        document.getElementById("actModalTitle").textContent = "Editar atividade";
        document.getElementById("actTitle").value = a.title;
        document.getElementById("actSubject").value = a.subject || "";
        document.getElementById("actType").value = a.activity_type;
        document.getElementById("actDue").value = a.due_date ? new Date(a.due_date).toISOString().slice(0,16) : "";
        document.getElementById("actDesc").value = a.description || "";
        document.getElementById("actPublished").checked = !!a.is_published;
        document.getElementById("questionsList").innerHTML = "";
        (a.questions || []).forEach(q => addQuestion(q));
        document.getElementById("activityModal").style.display = "flex";
        lucide.createIcons();
    } catch (e) { toast("Erro ao carregar: " + e.message, "error"); }
}

function closeModal() {
    document.getElementById("activityModal").style.display = "none";
    editingId = null;
}

document.getElementById("btnNewActivity").addEventListener("click", openNewModal);
document.getElementById("btnCancelActivity").addEventListener("click", closeModal);
document.getElementById("closeActModal").addEventListener("click", closeModal);
document.getElementById("btnAddQuestion").addEventListener("click", () => addQuestion());

document.getElementById("btnSaveActivity").addEventListener("click", async () => {
    let data;
    try { data = collectFormData(); } catch (e) { toast(e.message, "error"); return; }

    const btn = document.getElementById("btnSaveActivity");
    btn.disabled = true; btn.textContent = "Salvando...";
    try {
        if (editingId) {
            await apiRequest(`/activities/${editingId}`, { method: "PUT", body: JSON.stringify(data) });
            toast("Atividade atualizada!");
        } else {
            await apiRequest("/activities", { method: "POST", body: JSON.stringify(data) });
            toast("Atividade criada!");
        }
        closeModal();
        await loadAll();
    } catch (e) {
        toast(e.message || "Erro ao salvar.", "error");
    } finally {
        btn.disabled = false; btn.textContent = "Salvar atividade";
    }
});

async function deleteActivity(id) {
    const a = allActivities.find(x => x.id === id);
    if (!confirm(`Excluir "${a?.title || "esta atividade"}"? Esta ação não pode ser desfeita.`)) return;
    try {
        await apiRequest(`/activities/${id}`, { method: "DELETE" });
        toast("Atividade excluída!");
        await loadAll();
    } catch (e) { toast(e.message, "error"); }
}

async function duplicateActivity(id) {
    try {
        await apiRequest(`/activities/${id}/duplicate`, { method: "POST" });
        toast("Atividade duplicada como rascunho!");
        await loadAll();
    } catch (e) { toast(e.message, "error"); }
}

async function togglePublish(id) {
    try {
        const res = await apiRequest(`/activities/${id}/publish`, { method: "PATCH" });
        toast(res.is_published ? "Atividade publicada!" : "Atividade desativada.");
        await loadAll();
    } catch (e) { toast(e.message, "error"); }
}

// Close on overlay click
document.getElementById("activityModal").addEventListener("click", e => {
    if (e.target === document.getElementById("activityModal")) closeModal();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

loadAll();
