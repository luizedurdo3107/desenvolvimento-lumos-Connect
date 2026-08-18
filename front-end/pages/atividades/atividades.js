lucide.createIcons();

// ——— State ———
let allActivities = [];
let currentActivity = null;
let currentQuestion = 0;
let userAnswers = {};
let matchLeft = null;
let matchedPairs = 0;

const TYPE_LABELS = {
    QUIZ: "Quiz", FLASHCARD: "Flashcard", TRUE_FALSE: "Verdadeiro/Falso",
    MULTIPLE_CHOICE: "Múltipla Escolha", MATCHING: "Associação",
    GAME: "Jogo", STANDARD: "Leitura"
};
const TYPE_ICONS = {
    QUIZ: "brain", FLASHCARD: "layers", TRUE_FALSE: "check-circle-2",
    MULTIPLE_CHOICE: "list", MATCHING: "shuffle", GAME: "gamepad-2", STANDARD: "file-text"
};

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
document.getElementById("logoutBtn").addEventListener("click", () => logout());

// ——— Filters ———
let currentFilter = "all";
document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentFilter = btn.dataset.filter;
        renderActivities();
    });
});

// ——— Load activities ———
async function loadActivities() {
    try {
        allActivities = await apiRequest("/activities");
        renderActivities();
    } catch (e) {
        document.getElementById("activitiesGrid").innerHTML = `<p class="empty-state">Erro ao carregar atividades: ${e.message}</p>`;
    }
}

function renderActivities() {
    const grid = document.getElementById("activitiesGrid");
    const filtered = currentFilter === "all" ? allActivities : allActivities.filter(a => a.activity_type === currentFilter);
    if (!filtered.length) {
        grid.innerHTML = '<p class="empty-state">Nenhuma atividade encontrada.</p>';
        return;
    }
    grid.innerHTML = filtered.map(a => `
        <div class="activity-card ${a.completed ? "completed" : ""}" role="listitem" tabindex="0" data-id="${a.id}" aria-label="${a.title}">
            <div class="activity-type-badge">
                <i data-lucide="${TYPE_ICONS[a.activity_type] || 'file-text'}"></i>
                ${TYPE_LABELS[a.activity_type] || a.activity_type}
            </div>
            ${a.subject ? `<span class="subject-tag">${a.subject}</span>` : ""}
            <h3>${a.title}</h3>
            <p class="activity-description">${a.description || ""}</p>
            <div class="activity-footer">
                ${a.completed
                    ? `<span class="completed-badge"><i data-lucide="check-circle-2"></i> Concluída${a.score != null ? ` · ${a.score}%` : ""}</span>`
                    : `<span class="pending-badge">Pendente</span>`}
                <button class="primary-button btn-open" data-id="${a.id}">
                    ${a.completed ? "Refazer" : "Iniciar"}
                </button>
            </div>
        </div>
    `).join("");
    lucide.createIcons();

    document.querySelectorAll(".btn-open").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            openActivity(parseInt(btn.dataset.id));
        });
    });
    document.querySelectorAll(".activity-card").forEach(card => {
        card.addEventListener("keydown", e => {
            if (e.key === "Enter" || e.key === " ") openActivity(parseInt(card.dataset.id));
        });
    });
}

// ——— Open Activity ———
async function openActivity(id) {
    try {
        currentActivity = await apiRequest(`/activities/${id}`);
        currentQuestion = 0;
        userAnswers = {};
        matchLeft = null;
        matchedPairs = 0;
        document.getElementById("activityModal").style.display = "flex";
        document.getElementById("modalTitle").textContent = currentActivity.title;
        renderModal();
        lucide.createIcons();
    } catch (e) {
        alert("Erro ao abrir atividade: " + e.message);
    }
}

function renderModal() {
    const body = document.getElementById("modalBody");
    const footer = document.getElementById("modalFooter");
    const a = currentActivity;

    // Standard (text reading)
    if (a.activity_type === "STANDARD") {
        const contents = a.contents || [];
        body.innerHTML = `
            ${contents.map(c => `
                <div class="content-block">
                    ${c.title ? `<h3>${c.title}</h3>` : ""}
                    ${c.content ? `<p style="line-height:1.7">${c.content.replace(/\n/g, "<br>")}</p>` : ""}
                    ${c.url ? `<a href="${c.url}" target="_blank" rel="noopener">Acessar conteúdo</a>` : ""}
                </div>
            `).join("")}
            ${!contents.length ? `<p style="color:var(--text-secondary)">${a.description || "Conteúdo da atividade"}</p>` : ""}
            ${a.questions && a.questions.length ? `<hr style="margin:20px 0"><p style="font-weight:600">Questões:</p>${renderQuestionsHTML(a.questions)}` : ""}
        `;
        footer.innerHTML = `<button class="primary-button" id="btnSubmitStandard">Concluir atividade</button>`;
        document.getElementById("btnSubmitStandard").addEventListener("click", () => submitActivity());
        return;
    }

    // FLASHCARD
    if (a.activity_type === "FLASHCARD") {
        renderFlashcard();
        return;
    }

    // MATCHING
    if (a.activity_type === "MATCHING") {
        renderMatching();
        return;
    }

    // QUIZ / TRUE_FALSE / MULTIPLE_CHOICE
    if (["QUIZ", "TRUE_FALSE", "MULTIPLE_CHOICE"].includes(a.activity_type)) {
        renderQuestion();
        return;
    }

    // Generic fallback
    body.innerHTML = `<p>${a.description || "Atividade"}</p>`;
    footer.innerHTML = `<button class="primary-button" id="btnDone">Concluir</button>`;
    document.getElementById("btnDone").addEventListener("click", () => submitActivity());
}

// ——— Question renderer ———
function renderQuestion() {
    const questions = currentActivity.questions || [];
    if (!questions.length) { showResult(100, 0, 0, {}); return; }
    if (currentQuestion >= questions.length) { doSubmit(); return; }

    const q = questions[currentQuestion];
    const pct = Math.round((currentQuestion / questions.length) * 100);
    const body = document.getElementById("modalBody");
    const footer = document.getElementById("modalFooter");
    const letters = ["A", "B", "C", "D", "E"];

    body.innerHTML = `
        <div class="activity-progress-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
            <div class="activity-progress-fill" style="width:${pct}%"></div>
        </div>
        <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:12px">Questão ${currentQuestion + 1} de ${questions.length}</p>
        <div class="question-block">
            <p class="question-text">${q.question_text}</p>
            <div class="options-list" id="optionsList">
                ${(q.options || []).map((opt, i) => `
                    <button class="option-btn ${userAnswers[q.id] == opt.id ? "selected" : ""}" data-qid="${q.id}" data-oid="${opt.id}" aria-pressed="${userAnswers[q.id] == opt.id}">
                        <span class="option-letter">${letters[i] || i + 1}</span>
                        <span>${opt.option_text}</span>
                    </button>
                `).join("")}
            </div>
        </div>
    `;

    footer.innerHTML = `
        ${currentQuestion > 0 ? `<button class="secondary-button" id="btnPrev">Anterior</button>` : ""}
        <button class="primary-button" id="btnNext" ${userAnswers[q.id] == null ? "disabled" : ""}>
            ${currentQuestion < questions.length - 1 ? "Próxima" : "Finalizar"}
        </button>
    `;

    // Option selection
    document.querySelectorAll(".option-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".option-btn").forEach(b => { b.classList.remove("selected"); b.setAttribute("aria-pressed", "false"); });
            btn.classList.add("selected");
            btn.setAttribute("aria-pressed", "true");
            userAnswers[btn.dataset.qid] = parseInt(btn.dataset.oid);
            const nextBtn = document.getElementById("btnNext");
            if (nextBtn) nextBtn.disabled = false;
        });
    });

    const prevBtn = document.getElementById("btnPrev");
    const nextBtn = document.getElementById("btnNext");
    prevBtn && prevBtn.addEventListener("click", () => { currentQuestion--; renderQuestion(); });
    nextBtn && nextBtn.addEventListener("click", () => { currentQuestion++; renderQuestion(); });
}

function renderQuestionsHTML(questions) {
    return questions.map((q, qi) => `
        <div class="question-block" style="margin-bottom:16px">
            <p class="question-text">${qi + 1}. ${q.question_text}</p>
            ${q.options ? `<div class="options-list">${q.options.map((o, i) => `
                <button class="option-btn" data-qid="${q.id}" data-oid="${o.id}">
                    <span class="option-letter">${["A","B","C","D"][i]||i+1}</span>
                    <span>${o.option_text}</span>
                </button>`).join("")}</div>` : ""}
        </div>`).join("");
}

// ——— Flashcard renderer ———
function renderFlashcard() {
    const questions = currentActivity.questions || [];
    if (!questions.length) { submitActivity(); return; }
    let cardIndex = 0;
    let flipped = false;

    function showCard() {
        if (cardIndex >= questions.length) { submitActivity(); return; }
        const q = questions[cardIndex];
        const body = document.getElementById("modalBody");
        const footer = document.getElementById("modalFooter");
        flipped = false;

        body.innerHTML = `
            <p style="font-size:.85rem;color:var(--text-secondary);margin-bottom:16px;text-align:center">
                Card ${cardIndex + 1} de ${questions.length}
            </p>
            <div class="flashcard-container" id="flashcardWrap" role="button" tabindex="0" aria-label="Clique para virar o card">
                <div class="flashcard" id="flashcard">
                    <div class="flashcard-front">${q.question_text}</div>
                    <div class="flashcard-back">${q.explanation || "—"}</div>
                </div>
            </div>
            <p class="flashcard-hint">Clique no card para ver a resposta</p>
        `;

        footer.innerHTML = `
            ${cardIndex > 0 ? `<button class="secondary-button" id="fcPrev">Anterior</button>` : ""}
            <button class="primary-button" id="fcNext">${cardIndex < questions.length - 1 ? "Próximo" : "Concluir"}</button>
        `;

        const wrap = document.getElementById("flashcardWrap");
        const card = document.getElementById("flashcard");
        wrap.addEventListener("click", () => { flipped = !flipped; card.classList.toggle("flipped", flipped); });
        wrap.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { flipped = !flipped; card.classList.toggle("flipped", flipped); } });

        document.getElementById("fcNext").addEventListener("click", () => { userAnswers[q.id] = "viewed"; cardIndex++; showCard(); });
        document.getElementById("fcPrev") && document.getElementById("fcPrev").addEventListener("click", () => { cardIndex--; showCard(); });
    }

    showCard();
}

// ——— Matching renderer ———
function renderMatching() {
    const questions = currentActivity.questions || [];
    if (!questions.length) { submitActivity(); return; }

    // Build pairs: term (question_text) → answer (first option)
    const pairs = questions.map(q => ({
        id: q.id,
        term: q.question_text,
        answer: q.options && q.options.length ? q.options[0].option_text : "—"
    }));

    // Shuffle answers
    const shuffledAnswers = [...pairs].sort(() => Math.random() - .5);
    let matched = {};
    let selectedLeft = null;

    function renderMatch() {
        const body = document.getElementById("modalBody");
        const footer = document.getElementById("modalFooter");

        body.innerHTML = `
            <p style="margin-bottom:16px">Associe cada termo à sua definição:</p>
            <div class="matching-area">
                <div class="matching-col" id="leftCol">
                    ${pairs.map(p => `
                        <div class="matching-item ${matched[p.id] ? "matched" : ""}" data-id="${p.id}" data-side="left" role="button" tabindex="0" aria-label="${p.term}">
                            ${p.term}
                            ${matched[p.id] ? `<span style="float:right;color:#16a34a">✓</span>` : ""}
                        </div>`).join("")}
                </div>
                <div class="matching-col" id="rightCol">
                    ${shuffledAnswers.map(p => `
                        <div class="matching-item ${Object.values(matched).includes(p.id) ? "matched" : ""}" data-id="${p.id}" data-side="right" data-term="${p.term}" role="button" tabindex="0" aria-label="${p.answer}">
                            ${p.answer}
                        </div>`).join("")}
                </div>
            </div>
        `;

        footer.innerHTML = `<button class="primary-button" id="btnCheckMatch" ${Object.keys(matched).length < pairs.length ? "disabled" : ""}>
            ${Object.keys(matched).length < pairs.length ? `Associações: ${Object.keys(matched).length}/${pairs.length}` : "Verificar"}
        </button>`;

        // Click handlers
        document.querySelectorAll(".matching-item[data-side='left']").forEach(el => {
            el.addEventListener("click", () => {
                if (matched[el.dataset.id]) return;
                document.querySelectorAll(".matching-item[data-side='left']").forEach(e => e.classList.remove("selected-left"));
                el.classList.add("selected-left");
                selectedLeft = el.dataset.id;
            });
        });

        document.querySelectorAll(".matching-item[data-side='right']").forEach(el => {
            el.addEventListener("click", () => {
                if (!selectedLeft) return;
                if (Object.values(matched).includes(el.dataset.id)) return;
                // Match: leftId → rightId (should be same if correct)
                matched[selectedLeft] = el.dataset.id;
                selectedLeft = null;
                renderMatch();
            });
        });

        document.getElementById("btnCheckMatch") && document.getElementById("btnCheckMatch").addEventListener("click", () => {
            // Score matching: leftId should match rightId (same id = correct pair)
            let correct = 0;
            pairs.forEach(p => { if (matched[p.id] == p.id) correct++; });
            Object.keys(matched).forEach(leftId => {
                const rightId = matched[leftId];
                const isCorrect = leftId == rightId;
                userAnswers[leftId] = isCorrect ? rightId : null;
            });
            const score = Math.round((correct / pairs.length) * 100);
            showResult(score, correct, pairs.length, {});
        });
    }

    renderMatch();
}

// ——— Submit ———
async function doSubmit() {
    try {
        const result = await apiRequest(`/activities/${currentActivity.id}/submit`, {
            method: "POST",
            body: JSON.stringify({ answers: userAnswers })
        });
        showResult(result.score, result.correct, result.total, result.feedback || {});
    } catch (e) {
        alert("Erro ao enviar atividade: " + e.message);
    }
}

async function submitActivity() {
    try {
        await apiRequest(`/activities/${currentActivity.id}/submit`, {
            method: "POST",
            body: JSON.stringify({ answers: userAnswers })
        });
        showResult(100, 0, 0, {});
    } catch (e) {
        closeModal();
    }
}

function showResult(score, correct, total, feedback) {
    const body = document.getElementById("modalBody");
    const footer = document.getElementById("modalFooter");
    const emoji = score >= 80 ? "🎉" : score >= 50 ? "👍" : "📚";
    const msg = score >= 80 ? "Excelente resultado!" : score >= 50 ? "Bom trabalho!" : "Continue praticando!";

    const questions = currentActivity.questions || [];
    const feedbackHTML = questions.map(q => {
        const fb = feedback[q.id];
        if (!fb) return "";
        const cls = fb.correct === true ? "correct" : fb.correct === false ? "incorrect" : "neutral";
        const icon = fb.correct === true ? "✓" : fb.correct === false ? "✗" : "—";
        return `<div class="feedback-item ${cls}">
            <strong>${icon}</strong>
            <div>
                <p style="margin:0;font-weight:600">${q.question_text}</p>
                ${fb.explanation ? `<p style="margin:4px 0 0;font-size:.85rem">${fb.explanation}</p>` : ""}
            </div>
        </div>`;
    }).join("");

    body.innerHTML = `
        <div class="result-block">
            <div style="font-size:3rem">${emoji}</div>
            <div class="result-score">${score}%</div>
            ${total > 0 ? `<p class="result-msg">${correct} de ${total} corretas</p>` : ""}
            <p class="result-msg">${msg}</p>
        </div>
        ${feedbackHTML ? `<hr style="margin:16px 0"><div>${feedbackHTML}</div>` : ""}
    `;
    footer.innerHTML = `
        <button class="secondary-button" id="btnRetry">Refazer</button>
        <button class="primary-button" id="btnClose">Fechar</button>
    `;

    document.getElementById("btnRetry").addEventListener("click", () => {
        currentQuestion = 0; userAnswers = {}; matchLeft = null; matchedPairs = 0;
        renderModal();
    });
    document.getElementById("btnClose").addEventListener("click", () => {
        closeModal();
        loadActivities(); // refresh cards
    });

    loadActivities();
}

function closeModal() {
    document.getElementById("activityModal").style.display = "none";
    currentActivity = null;
}

document.getElementById("closeModal").addEventListener("click", closeModal);
document.getElementById("activityModal").addEventListener("click", e => {
    if (e.target === document.getElementById("activityModal")) closeModal();
});
document.addEventListener("keydown", e => {
    if (e.key === "Escape") closeModal();
});

loadActivities();
