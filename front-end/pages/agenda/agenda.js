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

// ——— State ———
let currentMonth = new Date();
let selectedDay = new Date();
let allEvents = [];
let editingId = null;

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const WEEKDAYS_SHORT = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const WEEKDAYS_FULL = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
const TYPE_LABELS = { prova:"Prova", tarefa:"Tarefa", estudo:"Estudo", evento:"Evento", exercicio:"Exercício", leitura:"Leitura", "":"Geral" };

function safeDate(val) {
    if (!val) return null;
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
}

function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
}

function formatDateInput(val) {
    const d = safeDate(val);
    if (!d) return "";
    const pad = n => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toast(msg, type = "success") {
    const el = document.createElement("div");
    el.style.cssText = `position:fixed;top:20px;right:20px;z-index:9999;background:#fff;border-left:4px solid ${type==="error"?"#ef4444":"#4E6F5A"};border-radius:10px;padding:14px 18px;box-shadow:0 8px 30px rgba(0,0,0,.15);font-size:.9rem;min-width:260px;color:#222;`;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3000);
}

// ——— Events for a day ———
function eventsForDay(day) {
    return allEvents.filter(e => {
        const d = safeDate(e.event_date);
        return d && isSameDay(d, day);
    });
}

// ——— Render big calendar ———
function renderCalendar() {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    document.getElementById("monthTitle").textContent = `${MONTHS[month]} ${year}`;

    const grid = document.getElementById("calGrid");
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    let html = WEEKDAYS_SHORT.map(w => `<div class="cal-weekday">${w}</div>`).join("");
    for (let i = 0; i < firstDay; i++) html += `<div class="cal-day empty"></div>`;

    for (let d = 1; d <= daysInMonth; d++) {
        const thisDay = new Date(year, month, d);
        const isToday = isSameDay(thisDay, today);
        const isSelected = isSameDay(thisDay, selectedDay);
        const hasEv = eventsForDay(thisDay).length > 0;
        html += `<div class="cal-day ${isToday ? "today" : ""} ${isSelected && !isToday ? "selected" : ""} ${hasEv ? "has-events" : ""}"
            data-date="${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}"
            role="gridcell" aria-label="${d} ${MONTHS[month]}" tabindex="0">
            ${d}
        </div>`;
    }
    grid.innerHTML = html;

    grid.querySelectorAll(".cal-day:not(.empty)").forEach(el => {
        el.addEventListener("click", () => selectDay(new Date(el.dataset.date + "T12:00:00")));
        el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") selectDay(new Date(el.dataset.date + "T12:00:00")); });
    });
}

// ——— Select a day ———
function selectDay(day) {
    selectedDay = day;
    renderCalendar();
    renderDayPanel();
}

// ——— Render day panel ———
function renderDayPanel() {
    const day = selectedDay;
    const weekday = WEEKDAYS_FULL[day.getDay()];
    const dateStr = `${day.getDate()} de ${MONTHS[day.getMonth()]}`;

    document.getElementById("selectedWeekday").textContent = weekday.toUpperCase();
    document.getElementById("selectedDate").textContent = dateStr;

    renderDayScroller();
    renderDayEvents();
}

// ——— Horizontal day scroller (±7 days) ———
function renderDayScroller() {
    const scroller = document.getElementById("dayScroller");
    const days = [];
    for (let i = -3; i <= 10; i++) {
        const d = new Date(selectedDay);
        d.setDate(d.getDate() + i);
        days.push(d);
    }

    scroller.innerHTML = days.map(d => {
        const isActive = isSameDay(d, selectedDay);
        const hasEv = eventsForDay(d).length > 0;
        const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        return `<div class="day-chip ${isActive ? "active" : ""}" data-date="${dateStr}" role="button" tabindex="0" aria-label="${WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()}">
            <span class="chip-weekday">${WEEKDAYS_SHORT[d.getDay()]}</span>
            <span class="chip-day">${d.getDate()}</span>
            ${hasEv ? `<span class="chip-dot"></span>` : `<span style="height:9px"></span>`}
        </div>`;
    }).join("");

    scroller.querySelectorAll(".day-chip").forEach(el => {
        el.addEventListener("click", () => selectDay(new Date(el.dataset.date + "T12:00:00")));
        el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") selectDay(new Date(el.dataset.date + "T12:00:00")); });
    });

    // Scroll active chip into view
    const active = scroller.querySelector(".active");
    if (active) active.scrollIntoView({ inline: "center", block: "nearest" });
}

// ——— Render events for selected day ———
function renderDayEvents() {
    const container = document.getElementById("dayEvents");
    const dayEvs = eventsForDay(selectedDay);

    if (!dayEvs.length) {
        container.innerHTML = '<p class="no-events">Nenhum evento neste dia.<br><small>Clique em "+ Adicionar" para criar um.</small></p>';
        return;
    }

    container.innerHTML = dayEvs.map(e => {
        const tag = TYPE_LABELS[e.event_type || ""] || "Geral";
        const done = e._done || false;
        return `<div class="event-row ${done ? "done" : ""}" data-id="${e.id}">
            <div class="event-checkbox" data-id="${e.id}"></div>
            <div class="event-info-col">
                <div class="event-title-row">${e.title}</div>
                ${e.description ? `<div class="event-sub">${e.description}</div>` : ""}
            </div>
            <span class="event-tag">${tag}</span>
            <button class="btn-icon" data-edit="${e.id}" aria-label="Editar" style="background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:var(--text-secondary)"><i data-lucide="pencil"></i></button>
            <button class="btn-icon" data-delete="${e.id}" aria-label="Excluir" style="background:none;border:none;cursor:pointer;padding:4px;border-radius:6px;color:#ef4444"><i data-lucide="trash-2"></i></button>
        </div>`;
    }).join("");

    lucide.createIcons();

    // Checkbox toggle (visual only)
    container.querySelectorAll(".event-checkbox").forEach(cb => {
        cb.addEventListener("click", () => {
            const row = cb.closest(".event-row");
            row.classList.toggle("done");
            const ev = allEvents.find(e => e.id == cb.dataset.id);
            if (ev) ev._done = row.classList.contains("done");
        });
    });

    container.querySelectorAll("[data-edit]").forEach(btn => {
        btn.addEventListener("click", () => openEditModal(parseInt(btn.dataset.edit)));
    });
    container.querySelectorAll("[data-delete]").forEach(btn => {
        btn.addEventListener("click", () => deleteEvent(parseInt(btn.dataset.delete)));
    });
}

// ——— Load events ———
async function loadEvents() {
    try {
        allEvents = await apiRequest(`/agenda?month=${currentMonth.getMonth()+1}&year=${currentMonth.getFullYear()}`);
        if (!Array.isArray(allEvents)) allEvents = [];
    } catch (e) {
        allEvents = [];
    }
    renderCalendar();
    renderDayPanel();
}

// ——— Month nav ———
document.getElementById("prevMonth").addEventListener("click", () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    loadEvents();
});
document.getElementById("nextMonth").addEventListener("click", () => {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    loadEvents();
});

// ——— Modal ———
function openAddModal(preDate) {
    editingId = null;
    document.getElementById("eventModalTitle").textContent = "Novo evento";
    document.getElementById("evTitle").value = "";
    document.getElementById("evType").value = "";
    document.getElementById("evDesc").value = "";
    const pad = n => String(n).padStart(2,"0");
    const d = preDate || selectedDay;
    document.getElementById("evDate").value = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T08:00`;
    document.getElementById("eventModal").style.display = "flex";
    document.getElementById("evTitle").focus();
}

function openEditModal(id) {
    const ev = allEvents.find(e => e.id === id);
    if (!ev) return;
    editingId = id;
    document.getElementById("eventModalTitle").textContent = "Editar evento";
    document.getElementById("evTitle").value = ev.title || "";
    document.getElementById("evDate").value = formatDateInput(ev.event_date);
    document.getElementById("evType").value = ev.event_type || "";
    document.getElementById("evDesc").value = ev.description || "";
    document.getElementById("eventModal").style.display = "flex";
    document.getElementById("evTitle").focus();
}

function closeModal() {
    document.getElementById("eventModal").style.display = "none";
    editingId = null;
}

document.getElementById("btnAddEvent").addEventListener("click", () => openAddModal());
document.getElementById("btnAddEventDay").addEventListener("click", () => openAddModal());
document.getElementById("btnCancelEvent").addEventListener("click", closeModal);

document.getElementById("btnSaveEvent").addEventListener("click", async () => {
    const title = document.getElementById("evTitle").value.trim();
    const dateVal = document.getElementById("evDate").value;
    const type = document.getElementById("evType").value;
    const desc = document.getElementById("evDesc").value.trim();

    if (!title) { toast("Informe o título", "error"); return; }
    if (!dateVal) { toast("Informe a data", "error"); return; }

    const testDate = new Date(dateVal);
    if (isNaN(testDate.getTime())) { toast("Data inválida", "error"); return; }

    const btn = document.getElementById("btnSaveEvent");
    btn.disabled = true; btn.textContent = "Salvando...";

    try {
        const body = { title, date: testDate.toISOString(), type: type || null, description: desc || null };
        if (editingId) {
            await apiRequest(`/agenda/${editingId}`, { method: "PUT", body: JSON.stringify(body) });
            toast("Evento atualizado!");
        } else {
            await apiRequest("/agenda", { method: "POST", body: JSON.stringify(body) });
            toast("Evento criado!");
        }
        closeModal();
        await loadEvents();
    } catch (e) {
        toast(e.message || "Erro ao salvar", "error");
    } finally {
        btn.disabled = false; btn.textContent = "Salvar";
    }
});

async function deleteEvent(id) {
    if (!confirm("Excluir este evento?")) return;
    try {
        await apiRequest(`/agenda/${id}`, { method: "DELETE" });
        toast("Evento excluído!");
        await loadEvents();
    } catch (e) {
        toast(e.message || "Erro ao excluir", "error");
    }
}

document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

loadEvents();